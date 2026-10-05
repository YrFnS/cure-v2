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

const TOKEN_TTL_MS = 10 * 60 * 1000;
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

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

@Controller()
@UseGuards(AuthGuard)
export class LabController {
  private readonly logger = new Logger(LabController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  // Patient: a short single-use code (shown as QR + text). It carries no patient data.
  @Post('lab-token')
  async createToken(@CurrentUser() user: AuthUser) {
    const code = Array.from({ length: 6 }, () => TOKEN_ALPHABET[crypto.randomInt(TOKEN_ALPHABET.length)]).join('');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await this.prisma.labToken.create({ data: { code, patientId: user.patientId!, expiresAt } });
    return { code, expiresAt };
  }

  private async liveToken(code: string) {
    const token = await this.prisma.labToken.findUnique({ where: { code: String(code ?? '').trim().toUpperCase() } });
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new BadRequestException('الرمز غير صالح أو منتهي، اطلب من المريض رمزاً جديداً');
    }
    return token;
  }

  // Lab: look the code up first so the tech confirms the patient's name before creating the order.
  @Get('lab/tokens/:code')
  @Roles('LAB')
  async lookupToken(@Param('code') code: string) {
    const token = await this.liveToken(code);
    const patient = await this.prisma.patient.findUniqueOrThrow({ where: { id: token.patientId } });
    return { patientName: patient.nameAr || patient.name, dateOfBirth: patient.dateOfBirth };
  }

  @Post('lab/orders')
  @Roles('LAB')
  async createOrder(@CurrentUser() user: AuthUser, @Body() body: { code?: string; testName?: string }) {
    const testName = String(body.testName ?? '').trim();
    if (!testName) throw new BadRequestException('اكتب اسم التحليل');
    const token = await this.liveToken(String(body.code ?? ''));

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
