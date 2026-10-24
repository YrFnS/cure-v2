import {
  BadRequestException, Body, Controller, Get, NotFoundException, Patch, Post, Put,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import type { WeeklySlot } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard, type AuthUser, CurrentUser, Roles } from './common/auth';
import { requireGender, requireText, toDoctorDto, toSlot, validateSlots } from './common/appointments';
import { PrismaService } from './common/prisma.service';
import { saveFile } from './common/storage';

@Controller('doctors/me')
@UseGuards(AuthGuard)
@Roles('DOCTOR')
export class DoctorsController {
  constructor(private readonly prisma: PrismaService) {}

  private async own(user: AuthUser) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId: user.userId } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  private async dto(doctor: any) {
    const hospital = doctor.hospitalId ? await this.prisma.hospital.findUnique({ where: { id: doctor.hospitalId } }) : null;
    return toDoctorDto(doctor, hospital);
  }

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    return this.dto(await this.own(user));
  }

  @Patch()
  async update(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    const doctor = await this.own(user);
    const data: Record<string, any> = {};
    for (const key of ['firstName', 'lastName', 'nameAr', 'specialty', 'bio']) {
      if (body[key] !== undefined) data[key] = requireText(body[key], key, key === 'bio' ? 5000 : ['firstName', 'lastName'].includes(key) ? 80 : 191, !['firstName', 'lastName'].includes(key));
    }
    if (data.firstName !== undefined || data.lastName !== undefined) {
      data.name = `${data.firstName ?? doctor.firstName} ${data.lastName ?? doctor.lastName}`;
    }
    if (body.gender !== undefined) data.gender = requireGender(body.gender);
    if (body.status !== undefined) {
      if (body.status !== 'ACTIVE' && body.status !== 'INACTIVE') throw new BadRequestException('Invalid status');
      data.status = body.status;
    }
    if (body.hospitalId !== undefined) {
      data.hospitalId = body.hospitalId === null ? null : requireText(body.hospitalId, 'hospitalId');
      if (data.hospitalId && !(await this.prisma.hospital.findUnique({ where: { id: data.hospitalId } }))) {
        throw new BadRequestException('Unknown hospital');
      }
    }
    const updated = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM Doctor WHERE id = ${doctor.id} FOR UPDATE`;
      return tx.doctor.update({ where: { id: doctor.id }, data });
    });
    return this.dto(updated);
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async photo(@CurrentUser() user: AuthUser, @UploadedFile() file?: { mimetype: string; buffer: Buffer }) {
    const doctor = await this.own(user);
    if (!file || !['image/jpeg', 'image/png'].includes(file.mimetype) ||
        !(file.mimetype === 'image/png' ? file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) :
          file.buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])))) {
      throw new BadRequestException('Photo must be JPEG or PNG');
    }
    const photo = await saveFile('avatars', file.mimetype, file.buffer);
    return this.dto(await this.prisma.doctor.update({ where: { id: doctor.id }, data: { photo } }));
  }

  @Get('schedule')
  async schedule(@CurrentUser() user: AuthUser) {
    const doctor = await this.own(user);
    const slots = await this.prisma.weeklySlot.findMany({ where: { doctorId: doctor.id, active: true }, orderBy: [{ day: 'asc' }, { from: 'asc' }] });
    return { slots: slots.map(toSlot) };
  }

  @Put('schedule')
  async replaceSchedule(@CurrentUser() user: AuthUser, @Body() body: { slots?: unknown }) {
    const inputs = validateSlots(body.slots);
    const doctor = await this.own(user);
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM Doctor WHERE id = ${doctor.id} FOR UPDATE`;
      const previous = await tx.weeklySlot.findMany({ where: { doctorId: doctor.id } });
      await tx.weeklySlot.updateMany({ where: { doctorId: doctor.id }, data: { active: false } });
      const slots: WeeklySlot[] = [];
      for (const input of inputs) {
        const old = previous.find(s => s.day === input.day && s.from === input.from && s.to === input.to);
        slots.push(old ? await tx.weeklySlot.update({ where: { id: old.id }, data: { active: true, maxAppointments: input.maxAppointments } }) :
          await tx.weeklySlot.create({ data: { ...input, doctorId: doctor.id } }));
      }
      return { slots: slots.map(toSlot) };
    });
  }
}
