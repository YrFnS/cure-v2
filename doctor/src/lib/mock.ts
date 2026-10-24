import type {
  Appointment,
  Doctor,
  Envelope,
  ProfilePatch,
  Signup,
  Slot,
  SlotInput,
  Status,
} from "./types";
import {
  canTransition,
  localDate,
  scheduleError,
  validBirthDate,
  validPhone,
} from "./validation";

// Fake, in-memory clinic only. Never store real patient or credential data here.
export function createMockApi() {
  let doctor: Doctor = {
    id: "demo-doctor",
    userId: "demo-user",
    firstName: "عمر",
    lastName: "أحمد",
    nameAr: "عمر أحمد",
    specialty: "طب الأسرة / Family medicine",
    bio: "",
    gender: "MALE",
    birthDate: "1985-06-15",
    phone: "07700000000",
    photoUrl: null,
    hospital: null,
    status: "ACTIVE",
  };
  let slots: Slot[] = [
    {
      id: "demo-slot-1",
      day: "SUN",
      from: "09:00",
      to: "12:00",
      maxAppointments: 12,
    },
    {
      id: "demo-slot-2",
      day: "TUE",
      from: "16:00",
      to: "19:00",
      maxAppointments: 10,
    },
    {
      id: "demo-slot-3",
      day: "THU",
      from: "09:00",
      to: "13:00",
      maxAppointments: 15,
    },
  ];
  const today = localDate();
  let appointments: Appointment[] = (
    ["SCHEDULED", "OPEN", "CLOSED", "CANCELLED"] as Status[]
  ).map((status, index) => ({
    id: `demo-appointment-${index}`,
    date: today,
    slot: {
      id: `demo-visit-${index}`,
      day: (["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const)[
        new Date().getDay()
      ],
      from: `${9 + index}`.padStart(2, "0") + ":00",
      to: `${10 + index}`.padStart(2, "0") + ":00",
    },
    status,
    createdAt: `${today}T08:00:00.000Z`,
    patient: {
      id: `demo-patient-${index}`,
      name: [
        "مراجع تجريبي ١",
        "مراجعة تجريبية ٢",
        "مراجع تجريبي ٣",
        "مراجعة تجريبية ٤",
      ][index],
      gender: index % 2 ? "FEMALE" : "MALE",
      age: 28 + index * 5,
    },
    doctor: {
      id: doctor.id,
      name: `${doctor.firstName} ${doctor.lastName}`,
      nameAr: doctor.nameAr,
      specialty: doctor.specialty,
      photoUrl: null,
      hospital: null,
    },
  }));
  let pendingPhone: string | null = null;
  let revoked = false;
  const session = () => {
    revoked = false;
    return {
      token: "mock-doctor-session",
      user: { id: doctor.userId, role: "DOCTOR" },
      role: "DOCTOR",
    };
  };
  function handle(
    path: string,
    method: string,
    body: unknown,
    token?: string | null,
  ): Envelope<unknown> {
    const [route, search] = path.split("?");
    const params = new URLSearchParams(search);
    const fail = (message: string, statusCode = 400): Envelope<never> => ({
      success: false,
      statusCode,
      message,
    });
    const ok = (data: unknown): Envelope<unknown> => ({
      success: true,
      data,
    });
    if (route === "/auth/login" && method === "POST") {
      const input = body as { phone: string; password: string };
      if (!validPhone(input.phone) || input.password.length < 6)
        return fail("Invalid demo login");
      return ok(session());
    }
    if (route === "/auth/doctor/signup/send" && method === "POST") {
      const input = body as { phone: string; password: string };
      if (!validPhone(input.phone) || input.password.length < 6)
        return fail("Invalid signup");
      pendingPhone = input.phone;
      return ok({ sent: true });
    }
    if (route === "/auth/doctor/signup/confirm" && method === "POST") {
      const input = body as Signup;
      if (pendingPhone !== input.phone || input.code !== "123456")
        return fail("Invalid demo code (123456)");
      if (
        !input.firstName.trim() ||
        !input.lastName.trim() ||
        !validBirthDate(input.birthDate)
      )
        return fail("Invalid profile");
      doctor = {
        ...doctor,
        firstName: input.firstName,
        lastName: input.lastName,
        nameAr: null,
        phone: input.phone,
        birthDate: input.birthDate,
        gender: input.gender,
        specialty: input.specialty ?? null,
      };
      pendingPhone = null;
      return ok(session());
    }
    if (token !== "mock-doctor-session" || revoked)
      return fail("Session expired", 401);
    if (route === "/auth/logout" && method === "POST") {
      revoked = true;
      return ok({ ok: true });
    }
    if (route === "/users/me") return ok({ id: doctor.userId, role: "DOCTOR" });
    if (route === "/doctors/me" && method === "GET") return ok(doctor);
    if (route === "/doctors/me" && method === "PATCH") {
      doctor = { ...doctor, ...(body as ProfilePatch) };
      return ok(doctor);
    }
    if (route === "/doctors/me/photo" && method === "POST") return ok(doctor);
    if (route === "/doctors/me/schedule" && method === "GET")
      return ok({ slots });
    if (route === "/doctors/me/schedule" && method === "PUT") {
      const input = body as { slots: SlotInput[] };
      const error = scheduleError(input.slots);
      if (error) return fail(error);
      slots = input.slots.map((slot, index) => ({
        ...slot,
        id: `demo-slot-${index}`,
      }));
      return ok({ slots });
    }
    if (route === "/doctors/me/appointments") {
      return ok(
        appointments
          .filter(
            (a) =>
              (!params.get("from") || a.date >= params.get("from")!) &&
              (!params.get("to") || a.date <= params.get("to")!) &&
              (!params.get("status") || a.status === params.get("status")),
          )
          .sort((a, b) =>
            `${a.date}${a.slot.from}`.localeCompare(`${b.date}${b.slot.from}`),
          ),
      );
    }
    if (route === "/doctors/me/stats") {
      const visits = appointments.filter((a) => a.date === params.get("date"));
      return ok({
        appointments: visits.length,
        patients: new Set(visits.map((a) => a.patient.id)).size,
      });
    }
    const match = route.match(/^\/appointments\/([^/]+)\/status$/);
    if (match && method === "PATCH") {
      const appointment = appointments.find((a) => a.id === match[1]);
      if (!appointment) return fail("Not found", 404);
      const status = (body as { status: Exclude<Status, "SCHEDULED"> }).status;
      if (!canTransition(appointment.status, status))
        return fail("Invalid transition");
      appointments = appointments.map((a) =>
        a.id === appointment.id ? { ...a, status } : a,
      );
      return ok({ ...appointment, status });
    }
    return fail("Unknown mock route", 404);
  }
  return handle;
}
