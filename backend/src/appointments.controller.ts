import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthGuard, type AuthUser, CurrentUser, Roles } from './common/auth';
import {
  appointmentInclude, assertTransition, clinicNow, DAYS, requireDate, requireText,
  slotIsFuture, STATUSES, toAppointmentDto,
} from './common/appointments';
import { PrismaService } from './common/prisma.service';
import { pushNotification } from './notifications.controller';

@Controller()
@UseGuards(AuthGuard)
export class AppointmentsController {
  constructor(private readonly prisma: PrismaService) {}

  private async dto(appointment: any) {
    const hospital = appointment.doctor.hospitalId ?
      await this.prisma.hospital.findUnique({ where: { id: appointment.doctor.hospitalId } }) : null;
    return toAppointmentDto(appointment, hospital);
  }

  @Get('doctors/me/appointments')
  @Roles('DOCTOR')
  async doctorAppointments(@CurrentUser() user: AuthUser, @Query('from') from?: string,
    @Query('to') to?: string, @Query('status') status?: string) {
    if (from !== undefined) requireDate(from);
    if (to !== undefined) requireDate(to);
    if (from && to && from > to) throw new BadRequestException('Invalid date range');
    if (status !== undefined && !STATUSES.includes(status as any)) throw new BadRequestException('Invalid status');
    const rows = await this.prisma.appointment.findMany({
      where: { doctor: { userId: user.userId }, date: { gte: from, lte: to }, status: status as any },
      include: appointmentInclude, orderBy: [{ date: 'asc' }, { slot: { from: 'asc' } }],
    });
    return Promise.all(rows.map(a => this.dto(a)));
  }

  @Get('doctors/me/stats')
  @Roles('DOCTOR')
  async stats(@CurrentUser() user: AuthUser, @Query('date') input: string) {
    const date = requireDate(input);
    const rows = await this.prisma.appointment.findMany({ where: { doctor: { userId: user.userId }, date }, select: { patientId: true } });
    return { appointments: rows.length, patients: new Set(rows.map(a => a.patientId)).size };
  }

  @Get('doctors/:id/availability')
  async availability(@Param('id') id: string, @Query('date') input: string) {
    const date = requireDate(input);
    const doctor = await this.prisma.doctor.findUnique({ where: { id } });
    if (!doctor || doctor.status !== 'ACTIVE') throw new NotFoundException('Doctor not found');
    if (!doctor.userId || date < clinicNow().date) return [];
    const slots = await this.prisma.weeklySlot.findMany({
      where: { doctorId: id, active: true, day: DAYS[new Date(date).getUTCDay()] }, orderBy: { from: 'asc' },
    });
    const bookings = await this.prisma.appointment.findMany({
      where: { doctorId: id, date, status: { not: 'CANCELLED' } }, select: { slot: { select: { from: true, to: true } } },
    });
    return slots.flatMap(slot => {
      // Older slots remain referenced by bookings after schedule replacement.
      const used = bookings.filter(a => a.slot.from < slot.to && a.slot.to > slot.from).length;
      const remaining = Math.max(0, slot.maxAppointments - used);
      return remaining > 0 && slotIsFuture(date, slot.from) ? [{ slotId: slot.id, from: slot.from, to: slot.to, remaining }] : [];
    });
  }

  @Post('appointments')
  async book(@CurrentUser() user: AuthUser, @Body() body: { doctorId?: string; slotId?: string; date?: string }) {
    const doctorId = requireText(body.doctorId, 'doctorId');
    const slotId = requireText(body.slotId, 'slotId');
    const date = requireDate(body.date);
    const appointment = await this.prisma.$transaction(async tx => {
      // All booking, status and schedule writers take this DB lock before reading capacity.
      await tx.$queryRaw`SELECT id FROM Doctor WHERE id = ${doctorId} FOR UPDATE`;
      const doctor = await tx.doctor.findUnique({ where: { id: doctorId } });
      if (!doctor || !doctor.userId || doctor.status !== 'ACTIVE') throw new NotFoundException('Doctor not found');
      const slot = await tx.weeklySlot.findUnique({ where: { id: slotId } });
      if (!slot || !slot.active || slot.doctorId !== doctorId || slot.day !== DAYS[new Date(date).getUTCDay()] || !slotIsFuture(date, slot.from)) {
        throw new BadRequestException('Slot is not available on this date');
      }
      const duplicate = await tx.appointment.count({
        where: { doctorId, patientId: user.patientId!, date, status: { in: ['SCHEDULED', 'OPEN'] } },
      });
      if (duplicate) throw new ConflictException('Already booked with this doctor on this date');
      const used = await tx.appointment.count({
        where: { doctorId, date, status: { not: 'CANCELLED' }, slot: { from: { lt: slot.to }, to: { gt: slot.from } } },
      });
      if (used >= slot.maxAppointments) throw new ConflictException('Slot is full');
      const row = await tx.appointment.create({
        data: { doctorId, slotId, date, patientId: user.patientId! }, include: appointmentInclude,
      });
      await tx.notification.create({ data: { userId: doctor.userId, type: 'appointment', actionId: row.id,
        titleAr: 'حجز موعد جديد', messageAr: `لديك حجز موعد جديد بتاريخ ${date} الساعة ${slot.from}` } });
      return row;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    await pushNotification(this.prisma, { userId: appointment.doctor.userId! }, 'حجز موعد جديد',
      `لديك حجز موعد جديد بتاريخ ${date} الساعة ${appointment.slot.from}`, appointment.id, 'appointment');
    return this.dto(appointment);
  }

  @Get('appointments')
  async mine(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.appointment.findMany({
      where: { patientId: user.patientId! }, include: appointmentInclude,
      orderBy: [{ date: 'asc' }, { slot: { from: 'asc' } }],
    });
    return Promise.all(rows.map(a => this.dto(a)));
  }

  private async change(user: AuthUser, id: string, status: unknown, byDoctor: boolean) {
    const where = byDoctor ? { id, doctor: { userId: user.userId } } : { id, patientId: user.patientId! };
    const existing = await this.prisma.appointment.findFirst({ where, select: { doctorId: true } });
    if (!existing) throw new NotFoundException('Appointment not found');
    const titleAr = byDoctor ? 'تحديث حالة الموعد' : 'إلغاء موعد';
    const changed = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM Doctor WHERE id = ${existing.doctorId} FOR UPDATE`;
      const row = await tx.appointment.findFirst({ where, include: appointmentInclude });
      if (!row) throw new NotFoundException('Appointment not found');
      assertTransition(row.status, status);
      const updated = await tx.appointment.update({ where: { id }, data: { status: status as any }, include: appointmentInclude });
      const recipient = byDoctor ? { patientId: row.patientId } : { userId: row.doctor.userId! };
      const labels = { OPEN: 'بدأ الموعد', CLOSED: 'اكتمل الموعد', CANCELLED: 'تم إلغاء الموعد' };
      const messageAr = `${labels[status as keyof typeof labels]} بتاريخ ${row.date} الساعة ${row.slot.from}`;
      await tx.notification.create({ data: { ...recipient, titleAr, messageAr, type: 'appointment', actionId: id } });
      return { updated, recipient, messageAr };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    await pushNotification(this.prisma, changed.recipient, titleAr, changed.messageAr, id, 'appointment');
    return this.dto(changed.updated);
  }

  @Patch('appointments/:id/status')
  @Roles('DOCTOR')
  status(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { status?: string }) {
    return this.change(user, id, body.status, true);
  }

  @Patch('appointments/:id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.change(user, id, 'CANCELLED', false);
  }
}
