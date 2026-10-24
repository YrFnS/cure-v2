# Cure v2 doctor feature — shared API contract (v1)

Both workers build against this exactly. All routes are under the backend's existing `/api`
prefix and use the existing global envelope `{ success, data }` / `{ success:false, statusCode, message }`.
Auth is the existing `Authorization: Bearer <session token>` from `POST auth/login`.
Times are local clinic time strings "HH:mm"; dates are "YYYY-MM-DD". Days are
`SUN MON TUE WED THU FRI SAT`.

## Roles
- `Role` enum gains `DOCTOR`. A DOCTOR user is NOT subject to the patient national-ID
  verification gate. Doctor routes require role DOCTOR (403 otherwise); patient routes keep
  their existing gate.
- Anyone may register as a doctor (owner decision: no approval step). A registered doctor
  with `status=ACTIVE` appears in the patient directory immediately.

## Doctor auth
- `POST auth/doctor/signup/send` `{ phone, password }` → `{ sent: true }` — same WhatsApp
  code mechanism as `auth/signup/send` (dev mode logs the code).
- `POST auth/doctor/signup/confirm` `{ phone, code, firstName, lastName, gender: "MALE"|"FEMALE",
  birthDate: "YYYY-MM-DD", specialty?: string, hospitalId?: string }` → same response shape as
  `auth/signup/confirm` (session token + user), user.role = "DOCTOR".
- Login, logout, password reset: the existing `auth/login`, `auth/logout`,
  `auth/password-reset/*`. `users/me` returns `role` so the app can refuse non-doctors.

## Doctor profile
- `GET doctors/me` → `Doctor`
- `PATCH doctors/me` `{ firstName?, lastName?, nameAr?, specialty?, bio?, gender?, hospitalId?, status?: "ACTIVE"|"INACTIVE" }` → `Doctor`
- `POST doctors/me/photo` multipart `photo` → `Doctor` (photo served the same private/expiring
  way patient profile photos are).
- `Doctor` = `{ id, userId, firstName, lastName, nameAr, specialty, bio, gender, birthDate,
  phone, photoUrl, hospital: { id, name } | null, status }`

## Schedule (weekly)
- `GET doctors/me/schedule` → `{ slots: Slot[] }`
- `PUT doctors/me/schedule` `{ slots: [{ day, from, to, maxAppointments }] }` → `{ slots: Slot[] }`
  (replaces the whole weekly schedule; validate from < to, no overlaps per day, 1 ≤ max ≤ 50).
- `Slot` = `{ id, day, from, to, maxAppointments }`

## Appointments
- Status: `SCHEDULED` (booked) → `OPEN` (doctor started/accepted) → `CLOSED` (done); any
  non-closed → `CANCELLED` (by doctor or patient).
- `Appointment` = `{ id, date, slot: { id, day, from, to }, status, createdAt,
  patient: { id, name, gender, age } , doctor: { id, name, nameAr, specialty, photoUrl, hospital } }`
  (a doctor sees only patient name/gender/age — no reports or lab results in v1).
- Doctor: `GET doctors/me/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD&status=` → `Appointment[]`
  sorted by date, slot.from. Only the caller's own appointments.
- Doctor: `GET doctors/me/stats?date=YYYY-MM-DD` → `{ appointments: number, patients: number }` (that day).
- Doctor: `PATCH appointments/:id/status` `{ status: "OPEN"|"CLOSED"|"CANCELLED" }` → `Appointment`
  (only own appointments; invalid transitions → 400).
- Patient: `GET doctors/:id/availability?date=YYYY-MM-DD` → `[{ slotId, from, to, remaining }]`
  (only slots for that weekday with remaining > 0; no past dates).
- Patient: `POST appointments` `{ doctorId, slotId, date }` → `Appointment` (verified patients
  only; overbooking prevented in a DB transaction; one active booking per patient per doctor per date → 409).
- Patient: `GET appointments` → own `Appointment[]`; `PATCH appointments/:id/cancel` → `Appointment`.
- Notifications (existing Notification table + push): doctor notified on new booking and
  patient cancel; patient notified on OPEN/CLOSED/CANCELLED by the doctor.
