import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { AiService } from './ai/ai.service';
import { AuthGuard, type AuthUser, CurrentUser, Roles } from './common/auth';
import { PrismaService } from './common/prisma.service';
import { decodeDataUpload, readFile, saveFile } from './common/storage';
import { notify } from './notifications.controller';

// The code is the only credential on the no-login upload page, so it is long (16 chars, ~80 bits).
const TOKEN_LENGTH = 16;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

async function liveToken(prisma: PrismaService, code: string) {
  const token = await prisma.labToken.findUnique({ where: { code: String(code ?? '').trim().toUpperCase() } });
  if (!token || token.usedAt || token.expiresAt < new Date()) {
    throw new BadRequestException('الرابط غير صالح أو منتهي، اطلب من المريض رابطاً جديداً');
  }
  return token;
}

// Generate the summary + tappable questions once per result; patients reuse the cached copy.
// ponytail: in-process dedupe, enough for one server process.
const inFlight = new Map<string, Promise<any>>();

export function ensureInsight(prisma: PrismaService, ai: AiService, order: any): Promise<any> {
  if (order.status !== 'READY' || !order.pdfPath || order.summary) return Promise.resolve(order);
  if (!inFlight.has(order.id)) {
    inFlight.set(order.id, generateInsight(prisma, ai, order).finally(() => inFlight.delete(order.id)));
  }
  return inFlight.get(order.id)!;
}

async function generateInsight(prisma: PrismaService, ai: AiService, order: any) {
  const pdf = await readFile(order.pdfPath);
  const insight = await ai.explainResult({ mimeType: 'application/pdf', base64: pdf.toString('base64') }, order.testName);
  return prisma.labOrder.update({
    where: { id: order.id },
    data: { summary: insight.summary, suggestions: insight.suggestions },
    include: { lab: true },
  });
}

// No-login upload page (backend/public/lab): whoever holds the patient's link can upload ONE
// result to that patient, once. Nothing records which lab it was beyond the name they type.
// ponytail: open link by owner decision (2026-10-05); the logged-in lab routes below stay for later.
@Controller('lab/link')
export class LabLinkController {
  private readonly logger = new Logger(LabLinkController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  // The page shows the patient's name so the lab can confirm it is the right person.
  @Get(':code')
  async lookup(@Param('code') code: string) {
    const token = await liveToken(this.prisma, code);
    const patient = await this.prisma.patient.findUniqueOrThrow({ where: { id: token.patientId } });
    return { patientName: patient.nameAr || patient.name, expiresAt: token.expiresAt };
  }

  @Post(':code')
  async upload(@Param('code') code: string, @Body() body: { labName?: string; testName?: string; pdf?: string }) {
    const labName = String(body.labName ?? '').trim().slice(0, 120);
    const testName = String(body.testName ?? '').trim().slice(0, 120);
    if (!labName) throw new BadRequestException('اكتب اسم المختبر');
    if (!testName) throw new BadRequestException('اكتب اسم التحليل');
    const pdf = decodeDataUpload(body.pdf, ['application/pdf']);
    const token = await liveToken(this.prisma, code);

    // Claim the link first so two simultaneous uploads cannot both succeed.
    const claimed = await this.prisma.labToken.updateMany({
      where: { code: token.code, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) throw new BadRequestException('تم استخدام هذا الرابط مسبقاً');

    const order = await this.prisma.labOrder.create({
      data: {
        patientId: token.patientId,
        labName,
        testName,
        status: 'READY',
        pdfPath: await saveFile('results', pdf.mimeType, pdf.buffer),
        readyAt: new Date(),
      },
    });
    await notify(this.prisma, order.patientId, 'نتيجة التحليل جاهزة', `نتيجة ${testName} من ${labName} جاهزة للعرض`, order.id);
    ensureInsight(this.prisma, this.ai, order).catch(error =>
      this.logger.warn(`AI insight for ${order.id} failed: ${error instanceof Error ? error.message : error}`),
    );
    return { ok: true };
  }
}

@Controller()
@UseGuards(AuthGuard)
export class LabController {
  private readonly logger = new Logger(LabController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  // Patient: a single-use upload link (shared as QR or text). It carries no patient data.
  @Post('lab-token')
  async createToken(@CurrentUser() user: AuthUser) {
    const code = Array.from({ length: TOKEN_LENGTH }, () => TOKEN_ALPHABET[crypto.randomInt(TOKEN_ALPHABET.length)]).join('');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await this.prisma.labToken.create({ data: { code, patientId: user.patientId!, expiresAt } });
    const url = `${(process.env.PUBLIC_URL ?? '').replace(/\/$/, '')}/lab/?t=${code}`;
    return { code, url, expiresAt };
  }

  // Lab: look the code up first so the tech confirms the patient's name before creating the order.
  @Get('lab/tokens/:code')
  @Roles('LAB')
  async lookupToken(@Param('code') code: string) {
    const token = await liveToken(this.prisma, code);
    const patient = await this.prisma.patient.findUniqueOrThrow({ where: { id: token.patientId } });
    return { patientName: patient.nameAr || patient.name, dateOfBirth: patient.dateOfBirth };
  }

  @Post('lab/orders')
  @Roles('LAB')
  async createOrder(@CurrentUser() user: AuthUser, @Body() body: { code?: string; testName?: string }) {
    const testName = String(body.testName ?? '').trim();
    if (!testName) throw new BadRequestException('اكتب اسم التحليل');
    const token = await liveToken(this.prisma, String(body.code ?? ''));

    const [, order] = await this.prisma.$transaction([
      this.prisma.labToken.update({ where: { code: token.code }, data: { usedAt: new Date() } }),
      this.prisma.labOrder.create({
        data: { patientId: token.patientId, labId: user.labId!, testName, createdBy: user.userId },
        include: { patient: true },
      }),
    ]);
    return { id: order.id, testName: order.testName, patientName: order.patient.nameAr, status: order.status };
  }

  // A lab sees only its own orders.
  @Get('lab/orders')
  @Roles('LAB')
  async listOrders(@CurrentUser() user: AuthUser) {
    const orders = await this.prisma.labOrder.findMany({
      where: { labId: user.labId! },
      include: { patient: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return orders.map(o => ({
      id: o.id,
      testName: o.testName,
      patientName: o.patient.nameAr || o.patient.name,
      status: o.status,
      createdAt: o.createdAt,
      readyAt: o.readyAt,
    }));
  }

  @Post('lab/orders/:id/result')
  @Roles('LAB')
  async uploadResult(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { pdf?: string }) {
    const order = await this.prisma.labOrder.findFirst({ where: { id, labId: user.labId! } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.status === 'READY') throw new BadRequestException('تم رفع النتيجة مسبقاً');
    const pdf = decodeDataUpload(body.pdf, ['application/pdf']);

    const ready = await this.prisma.labOrder.update({
      where: { id },
      data: {
        status: 'READY',
        pdfPath: await saveFile('results', pdf.mimeType, pdf.buffer),
        uploadedBy: user.userId,
        readyAt: new Date(),
      },
    });

    await notify(this.prisma, order.patientId, 'نتيجة التحليل جاهزة', `نتيجة ${order.testName} جاهزة للعرض`, id);

    // Summary is best-effort here; the patient's first view retries if the AI call failed.
    ensureInsight(this.prisma, this.ai, ready).catch(error =>
      this.logger.warn(`AI insight for ${id} failed: ${error instanceof Error ? error.message : error}`),
    );
    return { id, status: ready.status };
  }
}
