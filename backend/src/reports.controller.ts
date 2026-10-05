import { BadRequestException, Body, Controller, Get, Logger, NotFoundException, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AiService } from './ai/ai.service';
import { AuthGuard, type AuthUser, CurrentUser } from './common/auth';
import { PrismaService } from './common/prisma.service';
import { readFile } from './common/storage';
import { ensureInsight } from './lab.controller';

const day = (d: Date) => d.toISOString().slice(0, 10);

// Lab orders presented in the app's existing Report shape (app/src/lib/types.ts).
function toReport(order: any, patientName: string) {
  const base = (process.env.PUBLIC_URL ?? '').replace(/\/$/, '');
  return {
    id: order.id,
    patientId: order.patientId,
    type: 'laboratory',
    title: order.testName,
    titleAr: order.testName,
    date: day(order.readyAt ?? order.createdAt),
    doctorName: order.lab?.name ?? order.labName ?? '',
    doctorNameAr: order.lab?.name ?? order.labName ?? '',
    hospitalName: order.lab?.name ?? order.labName ?? '',
    hospitalLocation: order.lab?.location ?? '',
    patientNameAr: patientName,
    status: order.status === 'READY' ? 'ready' : 'pending',
    fileUrl: order.pdfPath ? `${base}/api/reports/${order.id}/file/result.pdf` : undefined,
    detailsAr: order.summary ?? undefined,
    suggestions: Array.isArray(order.suggestions) ? order.suggestions : [],
    answers: order.answers ?? {},
  };
}

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  private async patientName(user: AuthUser) {
    const p = await this.prisma.patient.findUniqueOrThrow({ where: { id: user.patientId! } });
    return p.nameAr || p.name;
  }

  private async ownOrder(user: AuthUser, id: string) {
    const order = await this.prisma.labOrder.findFirst({ where: { id, patientId: user.patientId! }, include: { lab: true } });
    if (!order) throw new NotFoundException('التقرير غير موجود');
    return order;
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('type') type?: string, @Query('limit') limit?: string) {
    if (type && type !== 'laboratory') return [];
    const orders = await this.prisma.labOrder.findMany({
      where: { patientId: user.patientId! },
      include: { lab: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 100, 100),
    });
    const name = await this.patientName(user);
    return orders.map(o => toReport(o, name));
  }

  @Get('recent')
  recent(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.list(user, undefined, limit ?? '5');
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    let order: any = await this.ownOrder(user, id);
    try {
      order = await ensureInsight(this.prisma, this.ai, order);
    } catch (error) {
      this.logger.warn(`AI insight for ${id} failed: ${error instanceof Error ? error.message : error}`);
    }
    return toReport(order, await this.patientName(user));
  }

  // Not a chat: the patient can only ask one of the suggested questions for this result.
  @Post(':id/ask')
  async ask(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { question?: string }) {
    const order = await this.ownOrder(user, id);
    const suggestions = Array.isArray(order.suggestions) ? (order.suggestions as string[]) : [];
    const question = String(body.question ?? '');
    if (!suggestions.includes(question)) throw new BadRequestException('اختر سؤالاً من الأسئلة المقترحة');

    const answers = (order.answers ?? {}) as Record<string, string>;
    if (answers[question]) return { question, answer: answers[question] };

    const pdf = await readFile(order.pdfPath!);
    const answer = await this.ai.answer({ mimeType: 'application/pdf', base64: pdf.toString('base64') }, order.testName, question);
    await this.prisma.labOrder.update({ where: { id }, data: { answers: { ...answers, [question]: answer } } });
    return { question, answer };
  }

  @Get(':id/file/:name')
  async file(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() res: Response) {
    const order = await this.ownOrder(user, id);
    if (!order.pdfPath) throw new NotFoundException('لا يوجد ملف');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(await readFile(order.pdfPath));
  }
}
