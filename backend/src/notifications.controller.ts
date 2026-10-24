import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AllowUnverified, AuthGuard, type AuthUser, CurrentUser, Roles } from './common/auth';
import { PrismaService } from './common/prisma.service';

const toDto = (n: any) => ({
  id: n.id,
  type: n.type,
  title: n.titleAr,
  titleAr: n.titleAr,
  message: n.messageAr,
  messageAr: n.messageAr,
  date: n.createdAt.toISOString().slice(0, 10),
  read: n.read,
  actionId: n.actionId ?? undefined,
  actionType: n.actionId ? n.type : undefined,
});

const logger = new Logger('Notifications');

// Push is best effort; appointment notifications are stored inside their transaction.
export async function pushNotification(prisma: PrismaService, recipient: { patientId: string } | { userId: string },
  titleAr: string, messageAr: string, actionId?: string, type = 'report') {
  try {
    const tokens = await prisma.pushToken.findMany({ where: recipient });
    if (tokens.length === 0) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokens.map(t => ({ to: t.token, title: titleAr, body: messageAr, data: { type, id: actionId } }))),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    logger.warn('Expo push failed');
  }
}

export async function notify(prisma: PrismaService, patientId: string, titleAr: string, messageAr: string, actionId?: string) {
  await prisma.notification.create({ data: { patientId, titleAr, messageAr, actionId } });
  await pushNotification(prisma, { patientId }, titleAr, messageAr, actionId);
}

const recipient = (user: AuthUser) => user.role === 'DOCTOR' ? { userId: user.userId } : { patientId: user.patientId! };

@Controller('notifications')
@UseGuards(AuthGuard)
@Roles('PATIENT', 'DOCTOR')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    const rows = await this.prisma.notification.findMany({
      where: recipient(user),
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 100, 100),
    });
    return rows.map(toDto);
  }

  @Get('recent')
  recent(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.list(user, limit ?? '5');
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: AuthUser) {
    return { count: await this.prisma.notification.count({ where: { ...recipient(user), read: false } }) };
  }

  @Patch('read-all')
  async readAll(@CurrentUser() user: AuthUser) {
    await this.prisma.notification.updateMany({ where: recipient(user), data: { read: true } });
    return { ok: true };
  }

  @Patch(':id/read')
  async read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.prisma.notification.updateMany({ where: { id, ...recipient(user) }, data: { read: true } });
    return { ok: true };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.prisma.notification.deleteMany({ where: { id, ...recipient(user) } });
    return { ok: true };
  }

  @Post('push-token')
  @AllowUnverified()
  async addToken(@CurrentUser() user: AuthUser, @Body() body: { token?: string }) {
    const token = String(body.token ?? '');
    if (token) {
      await this.prisma.pushToken.upsert({
        where: { token },
        create: { token, ...recipient(user) },
        update: { patientId: null, userId: null, ...recipient(user) },
      });
    }
    return { ok: true };
  }

  @Delete('push-token')
  @AllowUnverified()
  async removeToken(@CurrentUser() user: AuthUser, @Body() body: { token?: string }) {
    await this.prisma.pushToken.deleteMany({ where: { token: String(body.token ?? ''), ...recipient(user) } });
    return { ok: true };
  }
}
