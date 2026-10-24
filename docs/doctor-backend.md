# Doctor backend and patient booking

Implements [the shared API contract](doctor-api-contract.md). All paths below have
`/api` prefix and the existing `{ success, data }` response envelope.

## Database

- `Role.DOCTOR`; optional unique `Doctor.userId` links a login to its profile.
  Doctor adds first/last name, gender, birth date, bio and ACTIVE/INACTIVE status.
  Legacy directory entries without a user remain visible and cannot be booked.
- `WeeklySlot`: doctor, weekday, `HH:mm` interval, capacity (1–50), active flag.
  Replacing a schedule deactivates removed intervals instead of deleting appointment
  history. An unchanged weekday/time interval retains its ID.
- `Appointment`: patient, doctor, slot, `YYYY-MM-DD` date, status and creation time;
  indexed by doctor/date/status and patient/date.
- `Notification` and `PushToken` retain patient recipients and also support user
  recipients for doctors. Notifications add a type, defaulting to `report` for old rows.

Dates/times use clinic time in `Asia/Baghdad`. Booking, cancellation/status updates
and schedule replacement lock the doctor's database row (`SELECT … FOR UPDATE`).
Booking counts capacity in a READ COMMITTED transaction before insertion, and
rejects another SCHEDULED/OPEN booking by that patient for that doctor/date with 409.
Non-cancelled bookings count toward capacity, including historical intervals that
now overlap a replacement slot. Full slots and slots that have already started
are omitted from availability. Existing appointments keep their booked interval.

## Routes

| Access | Routes |
| --- | --- |
| Public signup | `POST auth/doctor/signup/send`, `POST auth/doctor/signup/confirm` |
| Existing auth | `POST auth/login`, `POST auth/logout`, `POST auth/password-reset/send`, `POST auth/password-reset/confirm`; `GET users/me` now includes role |
| Doctor profile | `GET/PATCH doctors/me`, `POST doctors/me/photo` (multipart `photo`, JPEG/PNG, max 5 MB) |
| Doctor schedule | `GET/PUT doctors/me/schedule` |
| Doctor appointments | `GET doctors/me/appointments?from=&to=&status=`, `GET doctors/me/stats?date=`, `PATCH appointments/:id/status` |
| Verified patients | `GET doctors/:id/availability?date=`, `POST/GET appointments`, `PATCH appointments/:id/cancel` |
| Both roles | Existing `notifications` list/read/delete/unread-count/push-token routes, scoped to their own recipient |

Doctor endpoints require DOCTOR and scope appointments to the session's doctor.
Patient endpoints retain the server-side national-ID gate. Appointment responses
expose only patient ID, name, gender and age, never reports, ID numbers or lab data.
Status changes are SCHEDULED → OPEN → CLOSED, or SCHEDULED/OPEN → CANCELLED;
all other transitions return 400. An appointment outside the caller's ownership
returns 404. Notifications are stored in the appointment transaction; push delivery
is best effort after commit.

Signup sends the existing WhatsApp OTP and retains only a salted password hash
until confirmation. The code/password state is process-local, like existing OTPs;
persist both before running multiple backend instances. Signup returns token,
role, a minimal user and the doctor profile. Existing login returns token/role.
Photos reuse private avatar storage and expiring signed links.

## Local checks

Use an isolated local MariaDB with `DATABASE_URL` configured; no real patient data.

```sh
cd backend
npm ci
npx prisma generate
npx prisma db push
npm run build
npm test
# Point only at an isolated database with the schema pushed; creates/cleans fake fixtures.
TEST_DATABASE_URL="$DATABASE_URL" npm test
npm run start:dev
```

There is no backend lint script. Tests cover the verification/role guards, doctor
ownership, capacity/duplicate conflicts, availability, transitions, notification
ownership, signup and schedule history. The optional MariaDB test races six
bookings for two seats and then cancels/rebooks; it skips without TEST_DATABASE_URL.

With development WhatsApp credentials unset, signup codes print in the backend
console. Register a fake doctor, log in, PUT a schedule for a future date's weekday,
and use a verified fake patient to book through doctor details. Account → My
appointments lists bookings and supports cancellation. Confirm OPEN/CLOSED and
CANCELLED changes from the doctor API, ownership rejection using another doctor's
session, and notification delivery. Verify AR/EN, RTL, empty availability, failed
requests/retry, and cancellation on a device.

```sh
cd app
bun test
bun run typecheck
bun run lint
```

Validation in this worktree: Prisma Client generation works. `prisma db push` to
local port 3306 failed (P1001). Starting a disposable local MariaDB was also blocked:
the sandbox forbids TCP and Unix socket binding. Apply the schema and run the
MariaDB test in a session with local database access before shipping.
