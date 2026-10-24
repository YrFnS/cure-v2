import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { signedFileUrl } from './signed-url';

export const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
export const STATUSES = ['SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED'] as const;
export const appointmentInclude = {
  slot: true,
  doctor: true,
  patient: { select: { id: true, name: true, nameAr: true, gender: true, dateOfBirth: true } },
} satisfies Prisma.AppointmentInclude;

export function requireDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('Date must be YYYY-MM-DD');
  }
  return value;
}

export function clinicNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Baghdad', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export function slotIsFuture(date: string, from: string, now = clinicNow()) {
  return date > now.date || (date === now.date && from > now.time);
}

export function requireText(value: unknown, field: string, max = 191, empty = false): string {
  if (typeof value !== 'string' || (!empty && !value.trim()) || value.length > max) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return value.trim();
}

export function requireGender(value: unknown): 'MALE' | 'FEMALE' {
  if (value !== 'MALE' && value !== 'FEMALE') throw new BadRequestException('Invalid gender');
  return value;
}

export type SlotInput = { day: typeof DAYS[number]; from: string; to: string; maxAppointments: number };
export function validateSlots(value: unknown): SlotInput[] {
  if (!Array.isArray(value)) throw new BadRequestException('Invalid slots');
  const slots = value.map(s => {
    if (!s || !DAYS.includes(s.day) || typeof s.from !== 'string' || typeof s.to !== 'string' ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.from) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.to) ||
        s.from >= s.to || !Number.isInteger(s.maxAppointments) || s.maxAppointments < 1 || s.maxAppointments > 50) {
      throw new BadRequestException('Invalid slot');
    }
    return { day: s.day, from: s.from, to: s.to, maxAppointments: s.maxAppointments } as SlotInput;
  });
  const sorted = [...slots].sort((a, b) => a.day.localeCompare(b.day) || a.from.localeCompare(b.from));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].day === sorted[i - 1].day && sorted[i].from < sorted[i - 1].to) {
      throw new BadRequestException('Slots must not overlap');
    }
  }
  return slots;
}

export function assertTransition(current: string, next: unknown) {
  if (!((current === 'SCHEDULED' && next === 'OPEN') || (current === 'OPEN' && next === 'CLOSED') ||
        ((current === 'SCHEDULED' || current === 'OPEN') && next === 'CANCELLED'))) {
    throw new BadRequestException('Invalid appointment status transition');
  }
}

export const toSlot = (s: any) => ({ id: s.id, day: s.day, from: s.from, to: s.to, maxAppointments: s.maxAppointments });
export function toDoctorDto(d: any, hospital: { id: string; name: string } | null) {
  return {
    id: d.id, userId: d.userId, firstName: d.firstName, lastName: d.lastName, nameAr: d.nameAr,
    specialty: d.specialty, bio: d.bio, gender: d.gender, birthDate: d.birthDate, phone: d.phone,
    photoUrl: d.photo ? signedFileUrl(d.photo) : null,
    hospital: hospital ? { id: hospital.id, name: hospital.name } : null, status: d.status,
  };
}

export function toAppointmentDto(a: any, hospital: { id: string; name: string } | null) {
  const today = clinicNow().date;
  const dob = a.patient.dateOfBirth;
  const age = /^\d{4}-\d{2}-\d{2}$/.test(dob) ?
    Number(today.slice(0, 4)) - Number(dob.slice(0, 4)) - (today.slice(5) < dob.slice(5) ? 1 : 0) : null;
  return {
    id: a.id, date: a.date, slot: { id: a.slot.id, day: a.slot.day, from: a.slot.from, to: a.slot.to },
    status: a.status, createdAt: a.createdAt,
    patient: { id: a.patient.id, name: a.patient.name || a.patient.nameAr, gender: a.patient.gender, age },
    doctor: { id: a.doctor.id, name: a.doctor.name || a.doctor.nameAr, nameAr: a.doctor.nameAr,
      specialty: a.doctor.specialty || a.doctor.specialtyAr, photoUrl: a.doctor.photo ? signedFileUrl(a.doctor.photo) : null,
      hospital: hospital ? { id: hospital.id, name: hospital.name } : null },
  };
}
