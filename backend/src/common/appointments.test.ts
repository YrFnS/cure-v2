import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppointmentsController } from '../appointments.controller';
import { AuthController } from '../auth.controller';
import { DirectoryController } from '../directory.controller';
import { DoctorsController } from '../doctors.controller';
import { NotificationsController } from '../notifications.controller';
import { PrismaService } from './prisma.service';
import { AuthGuard, type AuthUser, verifyPassword } from './auth';
import { assertTransition, clinicNow, DAYS, requireDate, slotIsFuture, toAppointmentDto, validateSlots } from './appointments';

const patient: AuthUser = { userId: 'patient-user', role: 'PATIENT', patientId: 'patient', verified: true, labId: null };
const doctor: AuthUser = { userId: 'doctor-user', role: 'DOCTOR', patientId: null, verified: false, labId: null };
const slot = { id: 'slot', doctorId: 'doctor', day: DAYS[new Date('2099-01-01').getUTCDay()], from: '09:00', to: '10:00', maxAppointments: 1, active: true };
const doctorRow = { id: 'doctor', userId: doctor.userId, name: 'Fake Doctor', nameAr: 'طبيب تجريبي', specialty: 'General', hospitalId: null, status: 'ACTIVE', photo: null };
const appointment = (status = 'SCHEDULED') => ({
  id: 'appointment', date: '2099-01-01', status, createdAt: new Date(), slotId: slot.id, slot,
  patientId: patient.patientId, doctorId: doctorRow.id, doctor: doctorRow,
  patient: { id: 'patient', name: 'Fake patient', gender: 'male', dateOfBirth: '2000-01-01' },
});

function guardContext(handler: Function, controller: Function, role = 'PATIENT', verified = false) {
  const request: any = { headers: { authorization: 'Bearer fake-session' } };
  const prisma: any = { session: { findUnique: async () => ({ expiresAt: new Date(Date.now() + 60000),
    user: { id: role === 'DOCTOR' ? doctor.userId : patient.userId, role, labId: null,
      patient: role === 'PATIENT' ? { id: 'patient', verifiedAt: verified ? new Date() : null } : null } }) } };
  const context: any = { switchToHttp: () => ({ getRequest: () => request }), getHandler: () => handler, getClass: () => controller };
  return { guard: new AuthGuard(prisma, new Reflector()), context, request };
}

test('unverified patient cannot book; doctor is exempt only on doctor routes', async () => {
  let fixture = guardContext(AppointmentsController.prototype.book, AppointmentsController);
  await assert.rejects(fixture.guard.canActivate(fixture.context), ForbiddenException);
  fixture = guardContext(AppointmentsController.prototype.book, AppointmentsController, 'PATIENT', true);
  assert.equal(await fixture.guard.canActivate(fixture.context), true);
  fixture = guardContext(AppointmentsController.prototype.doctorAppointments, AppointmentsController, 'DOCTOR');
  assert.equal(await fixture.guard.canActivate(fixture.context), true);
  assert.equal(fixture.request.user.verified, false);
  for (const [method, role] of [[AppointmentsController.prototype.book, 'DOCTOR'], [AppointmentsController.prototype.doctorAppointments, 'PATIENT']] as const) {
    fixture = guardContext(method, AppointmentsController, role, true);
    await assert.rejects(fixture.guard.canActivate(fixture.context), ForbiddenException);
  }
});

test('doctor appointment reads/stats and status mutations are scoped to their owner', async () => {
  const prisma: any = { appointment: {
    findMany: async ({ where, include }: any) => {
      assert.equal(where.doctor.userId, doctor.userId);
      if (include) assert.deepEqual(Object.keys(include.patient.select).sort(), ['dateOfBirth', 'gender', 'id', 'name', 'nameAr']);
      return [];
    },
    findFirst: async ({ where }: any) => {
      assert.deepEqual(where, { id: 'someone-elses-appointment', doctor: { userId: doctor.userId } });
      return null;
    },
  } };
  const controller = new AppointmentsController(prisma);
  assert.deepEqual(await controller.doctorAppointments(doctor), []);
  assert.deepEqual(await controller.stats(doctor, '2099-01-01'), { appointments: 0, patients: 0 });
  await assert.rejects(controller.status(doctor, 'someone-elses-appointment', { status: 'OPEN' }), NotFoundException);
});

test('dates, schedules and all invalid status transitions reject with 400', () => {
  for (const date of ['2026-02-30', '2026-13-01', '2026-1-01', '', null]) assert.throws(() => requireDate(date), BadRequestException);
  assert.equal(requireDate('2028-02-29'), '2028-02-29');
  assert.deepEqual(validateSlots([]), []);
  assert.equal(validateSlots([{ ...slot }]).length, 1);
  for (const bad of [{ ...slot, maxAppointments: 0 }, { ...slot, maxAppointments: 51 }, { ...slot, maxAppointments: 1.5 },
    { ...slot, day: 'MONDAY' }, { ...slot, from: '24:00' }, { ...slot, from: slot.to }]) {
    assert.throws(() => validateSlots([bad]), BadRequestException);
  }
  assert.throws(() => validateSlots([slot, { ...slot, from: '09:30' }]), BadRequestException);
  assert.equal(validateSlots([slot, { ...slot, from: '10:00', to: '11:00' }]).length, 2);
  const allowed = new Set(['SCHEDULED:OPEN', 'SCHEDULED:CANCELLED', 'OPEN:CLOSED', 'OPEN:CANCELLED']);
  for (const current of ['SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED']) {
    for (const next of ['SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED', 'INVALID']) {
      if (allowed.has(`${current}:${next}`)) assert.doesNotThrow(() => assertTransition(current, next));
      else assert.throws(() => assertTransition(current, next), BadRequestException);
    }
  }
});

test('invalid transition reaches controller as 400 without update or notification', async () => {
  const prisma: any = {
    appointment: { findFirst: async () => ({ doctorId: 'doctor' }) },
    $transaction: async (fn: any) => fn({ $queryRaw: async () => [], appointment: { findFirst: async () => appointment('CLOSED'),
      update: () => assert.fail('invalid transition must not write') } }),
  };
  await assert.rejects(new AppointmentsController(prisma).status(doctor, 'appointment', { status: 'OPEN' }), BadRequestException);
});

test('availability excludes full slots, past dates and times; counts historical overlapping bookings', async () => {
  const prisma: any = {
    doctor: { findUnique: async () => doctorRow },
    weeklySlot: { findMany: async () => [slot, { ...slot, id: 'free', from: '11:00', to: '12:00', maxAppointments: 2 }] },
    appointment: { findMany: async ({ where }: any) => {
      assert.deepEqual(where.status, { not: 'CANCELLED' });
      return [{ slot: { from: '08:30', to: '09:30' } }];
    } },
  };
  const controller = new AppointmentsController(prisma);
  assert.deepEqual(await controller.availability('doctor', '2000-01-01'), []);
  assert.deepEqual(await controller.availability('doctor', '2099-01-01'), [{ slotId: 'free', from: '11:00', to: '12:00', remaining: 2 }]);
  prisma.weeklySlot.findMany = async () => [{ ...slot, from: '00:00', to: '00:01' }];
  prisma.appointment.findMany = async () => [];
  assert.deepEqual(await controller.availability('doctor', clinicNow().date), []);
  assert.equal(slotIsFuture('2026-10-24', '09:00', { date: '2026-10-24', time: '09:00' }), false);
  assert.equal(clinicNow(new Date('2026-10-24T22:30:00Z')).date, '2026-10-25');
});

// This double verifies that the controller locks before any capacity read. A real DB race test is below.
function bookingStore() {
  const rows: any[] = [];
  const notices: any[] = [];
  let tail = Promise.resolve();
  let held = false;
  const prisma: any = {
    pushToken: { findMany: async () => [] },
    $transaction: async (fn: any) => {
      const previous = tail;
      let unlock!: () => void;
      tail = new Promise<void>(resolve => { unlock = resolve; });
      await previous;
      held = false;
      try {
        return await fn({
          $queryRaw: async (sql: TemplateStringsArray, id: string) => {
            assert.match(sql.join('?'), /SELECT id FROM Doctor WHERE id = \? FOR UPDATE/);
            assert.equal(id, 'doctor'); held = true; return [{ id }];
          },
          doctor: { findUnique: async () => { assert.equal(held, true); return doctorRow; } },
          weeklySlot: { findUnique: async () => slot },
          appointment: {
            count: async ({ where }: any) => {
              assert.equal(held, true);
              return rows.filter(a => a.date === where.date && a.doctorId === where.doctorId &&
                (where.patientId ? a.patientId === where.patientId && ['SCHEDULED', 'OPEN'].includes(a.status) : a.status !== 'CANCELLED')).length;
            },
            create: async ({ data }: any) => { const row = { ...appointment(), ...data, id: `a${rows.length}` }; rows.push(row); return row; },
          },
          notification: { create: async ({ data }: any) => { notices.push(data); } },
        });
      } finally { unlock(); }
    },
  };
  return { controller: new AppointmentsController(prisma), rows, notices };
}

test('concurrent bookings for one seat yield one success and one 409', async () => {
  const { controller, rows, notices } = bookingStore();
  const body = { doctorId: 'doctor', slotId: 'slot', date: '2099-01-01' };
  const results = await Promise.allSettled([controller.book(patient, body), controller.book({ ...patient, patientId: 'other' }, body)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof ConflictException);
  assert.equal(rows.length, 1);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].userId, doctor.userId);
});

test('one active booking per patient/doctor/date returns 409 and exposes only allowed patient fields', async () => {
  const { controller } = bookingStore();
  const body = { doctorId: 'doctor', slotId: 'slot', date: '2099-01-01' };
  const dto = await controller.book(patient, body);
  assert.deepEqual(Object.keys(dto.patient).sort(), ['age', 'gender', 'id', 'name']);
  await assert.rejects(controller.book(patient, body), ConflictException);
  assert.equal(toAppointmentDto(appointment(), null).doctor.photoUrl, null);
});

test('doctor notification operations and new push tokens stay scoped to the doctor user', async () => {
  const prisma: any = {
    notification: {
      findMany: async ({ where }: any) => { assert.deepEqual(where, { userId: doctor.userId }); return []; },
      updateMany: async ({ where }: any) => assert.deepEqual(where, { id: 'n', userId: doctor.userId }),
      deleteMany: async ({ where }: any) => assert.deepEqual(where, { id: 'n', userId: doctor.userId }),
    },
    pushToken: { upsert: async ({ create, update }: any) => {
      assert.deepEqual(create, { token: 'fake', userId: doctor.userId });
      assert.equal(update.patientId, null);
      assert.equal(update.userId, doctor.userId);
    } },
  };
  const controller = new NotificationsController(prisma);
  await controller.list(doctor); await controller.read(doctor, 'n'); await controller.remove(doctor, 'n');
  await controller.addToken(doctor, { token: 'fake' });
});

test('doctor signup reuses WhatsApp OTP and the password from send, returns a DOCTOR session', async () => {
  let code = '';
  const prisma: any = { user: {
    findUnique: async () => null,
    create: async ({ data }: any) => {
      assert.equal(data.role, 'DOCTOR');
      assert.equal(verifyPassword('fake-password', data.passwordHash, data.passwordSalt), true);
      return { id: 'new-doctor', role: 'DOCTOR', doctor: { ...doctorRow, ...data.doctor.create } };
    },
  }, session: { create: async () => ({}) } };
  const whatsapp: any = { send: async (_: string, message: string) => { code = message.match(/\d{6}/)![0]; } };
  const controller = new AuthController(prisma, whatsapp);
  assert.deepEqual(await controller.doctorSignupSend({ phone: '07700000000', password: 'fake-password' }), { sent: true });
  const result = await controller.doctorSignupConfirm({ phone: '07700000000', code, firstName: 'Fake', lastName: 'Doctor', gender: 'MALE', birthDate: '1990-01-01' });
  assert.equal(result.user.role, 'DOCTOR');
  assert.equal(result.token.length, 64);
  await assert.rejects(controller.doctorSignupConfirm({ phone: '07700000000', code, firstName: 'Fake', lastName: 'Doctor', gender: 'MALE', birthDate: '1990-01-01' }), BadRequestException);
});

test('schedule replacement keeps referenced slot rows and reuses unchanged times', async () => {
  const prisma: any = {
    doctor: { findUnique: async () => doctorRow },
    $transaction: async (fn: any) => fn({
      $queryRaw: async () => [], weeklySlot: {
        findMany: async () => [slot],
        updateMany: async ({ data }: any) => assert.deepEqual(data, { active: false }),
        update: async ({ where, data }: any) => { assert.equal(where.id, slot.id); return { ...slot, ...data }; },
        create: async () => assert.fail('unchanged times must keep their IDs'),
      },
    }),
  };
  const result = await new DoctorsController(prisma).replaceSchedule(doctor, { slots: [{ ...slot, maxAppointments: 2 }] });
  assert.equal(result.slots[0].id, slot.id);
  assert.equal(result.slots[0].maxAppointments, 2);
});

test('MariaDB: simultaneous bookings cannot exceed capacity', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const prisma = new PrismaService();
  if (previousUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousUrl;
  const userIds: string[] = [];
  let doctorId: string | undefined;
  try {
    await prisma.$connect();
    const owner = await prisma.user.create({ data: { role: 'DOCTOR', passwordHash: 'fake', passwordSalt: 'fake',
      doctor: { create: { firstName: 'Fake', lastName: 'Doctor', name: 'Fake Doctor' } } }, include: { doctor: true } });
    userIds.push(owner.id);
    doctorId = owner.doctor!.id;
    const callers: AuthUser[] = [];
    for (let i = 0; i < 6; i++) {
      const row = await prisma.user.create({ data: { passwordHash: 'fake', passwordSalt: 'fake',
        patient: { create: { name: `Fake Patient ${i}`, verifiedAt: new Date() } } }, include: { patient: true } });
      userIds.push(row.id);
      callers.push({ ...patient, userId: row.id, patientId: row.patient!.id });
    }
    const scheduled = await prisma.weeklySlot.create({ data: { doctorId, day: slot.day, from: slot.from, to: slot.to, maxAppointments: 2 } });
    const controller = new AppointmentsController(prisma);
    const input = { doctorId: owner.doctor!.id, slotId: scheduled.id, date: '2099-01-01' };
    const results = await Promise.allSettled(callers.map(caller => controller.book(caller, input)));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 2);
    const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    assert.equal(failures.length, 4);
    for (const failure of failures) assert.ok(failure.reason instanceof ConflictException);
    assert.equal(await prisma.appointment.count({ where: { doctorId } }), 2);
    assert.deepEqual(await controller.availability(input.doctorId, input.date), []);
    const booked = results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>;
    const caller = callers.find(c => c.patientId === booked.value.patient.id)!;
    await controller.cancel(caller, booked.value.id);
    assert.equal((await controller.availability(input.doctorId, input.date))[0].remaining, 1);
    await controller.book(caller, input);
    assert.equal(await prisma.appointment.count({ where: { doctorId, status: { not: 'CANCELLED' } } }), 2);
  } finally {
    if (doctorId) {
      await prisma.appointment.deleteMany({ where: { doctorId } });
      await prisma.weeklySlot.deleteMany({ where: { doctorId } });
      await prisma.doctor.delete({ where: { id: doctorId } });
    }
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }
});

test('doctor changes notify the patient; patient cancellation notifies the doctor', async () => {
  let row = appointment();
  const notices: any[] = [];
  const prisma: any = {
    pushToken: { findMany: async () => [] },
    appointment: { findFirst: async () => ({ doctorId: 'doctor' }) },
    $transaction: async (fn: any) => fn({
      $queryRaw: async () => [], appointment: {
        findFirst: async ({ where }: any) => {
          if (where.patientId) assert.equal(where.patientId, patient.patientId);
          else assert.equal(where.doctor.userId, doctor.userId);
          return row;
        },
        update: async ({ data }: any) => { row = { ...row, ...data }; return row; },
      }, notification: { create: async ({ data }: any) => { notices.push(data); } },
    }),
  };
  const controller = new AppointmentsController(prisma);
  assert.equal((await controller.status(doctor, row.id, { status: 'OPEN' })).status, 'OPEN');
  assert.equal((await controller.status(doctor, row.id, { status: 'CLOSED' })).status, 'CLOSED');
  assert.equal(notices[0].patientId, patient.patientId);
  assert.equal(notices[1].patientId, patient.patientId);
  assert.equal(notices[0].type, 'appointment');
  await assert.rejects(controller.cancel(patient, row.id), BadRequestException);
  row = appointment();
  assert.equal((await controller.cancel(patient, row.id)).status, 'CANCELLED');
  assert.equal(notices[2].userId, doctor.userId);
  row = appointment();
  assert.equal((await controller.status(doctor, row.id, { status: 'CANCELLED' })).status, 'CANCELLED');
  assert.equal(notices[3].patientId, patient.patientId);
});


test('legacy directory doctors keep their existing details and cannot be booked', async () => {
  const legacy = { id: 'legacy', userId: null, nameAr: 'طبيب قديم', name: 'Legacy Doctor', specialty: 'General',
    specialtyAr: '', hospitalId: 'hospital', phone: 'fake-phone', photo: 'https://example.test/fake.png', status: 'ACTIVE' };
  const prisma: any = {
    doctor: { findUnique: async () => legacy, findMany: async () => [legacy] },
    hospital: { findMany: async () => [{ id: 'hospital', name: 'Fake hospital', location: 'Fake location' }] },
  };
  const controller = new DirectoryController(prisma);
  const detail = await controller.doctor('legacy');
  assert.equal(detail.nameAr, legacy.nameAr);
  assert.equal(detail.photo, legacy.photo);
  assert.equal(detail.hospitalName, 'Fake hospital');
  assert.equal(detail.bookable, false);
  assert.equal((await controller.doctors())[0].id, legacy.id);
  assert.deepEqual(await new AppointmentsController(prisma).availability('legacy', '2099-01-01'), []);
});
