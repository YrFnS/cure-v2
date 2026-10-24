import { expect, test } from "bun:test";
import { createMockApi } from "./mock";
import { localDate } from "./validation";
import type {
  Appointment,
  AuthResponse,
  Doctor,
  Envelope,
  Slot,
} from "./types";

function unwrap<T>(result: Envelope<unknown>): T {
  if (!result.success) throw new Error(result.message.toString());
  return result.data as T;
}
test("mock uses contract envelopes, scoped data and valid transitions", () => {
  const mock = createMockApi();
  expect(mock("/doctors/me", "GET", undefined).success).toBe(false);
  const login = unwrap<AuthResponse>(
    mock("/auth/login", "POST", {
      phone: "07700000000",
      password: "demo-pass",
    }),
  );
  const call = (path: string, method = "GET", body?: unknown) =>
    mock(path, method, body, login.token);
  expect(unwrap<{ role: string }>(call("/users/me")).role).toBe("DOCTOR");
  const appointments = unwrap<Appointment[]>(call("/doctors/me/appointments"));
  expect(appointments).toHaveLength(4);
  expect(Object.keys(appointments[0].patient).sort()).toEqual([
    "age",
    "gender",
    "id",
    "name",
  ]);
  expect(
    unwrap<Appointment[]>(call("/doctors/me/appointments?status=OPEN")),
  ).toHaveLength(1);
  expect(
    unwrap<Appointment[]>(call("/doctors/me/appointments?from=3000-01-01")),
  ).toHaveLength(0);
  expect(
    unwrap<{ patients: number }>(call(`/doctors/me/stats?date=${localDate()}`))
      .patients,
  ).toBe(4);
  expect(
    call("/appointments/demo-appointment-0/status", "PATCH", {
      status: "CLOSED",
    }).success,
  ).toBe(false);
  expect(
    unwrap<Appointment>(
      call("/appointments/demo-appointment-0/status", "PATCH", {
        status: "OPEN",
      }),
    ).status,
  ).toBe("OPEN");
  expect(
    unwrap<Appointment>(
      call("/appointments/demo-appointment-0/status", "PATCH", {
        status: "CLOSED",
      }),
    ).status,
  ).toBe("CLOSED");
  expect(
    call("/appointments/demo-appointment-0/status", "PATCH", {
      status: "CANCELLED",
    }).success,
  ).toBe(false);
  call("/auth/logout", "POST");
  expect(call("/doctors/me").success).toBe(false);
});
test("mock schedule failures preserve existing slots and a retry can save an empty week", () => {
  const mock = createMockApi();
  const token = unwrap<AuthResponse>(
    mock("/auth/login", "POST", {
      phone: "07700000000",
      password: "demo-pass",
    }),
  ).token;
  const before = unwrap<{ slots: Slot[] }>(
    mock("/doctors/me/schedule", "GET", undefined, token),
  );
  expect(
    mock(
      "/doctors/me/schedule",
      "PUT",
      {
        slots: [
          { day: "SUN", from: "20:00", to: "09:00", maxAppointments: 10 },
        ],
      },
      token,
    ).success,
  ).toBe(false);
  expect(
    unwrap<{ slots: Slot[] }>(
      mock("/doctors/me/schedule", "GET", undefined, token),
    ),
  ).toEqual(before);
  expect(
    unwrap<{ slots: Slot[] }>(
      mock("/doctors/me/schedule", "PUT", { slots: [] }, token),
    ).slots,
  ).toEqual([]);
});
test("signup confirms a server-issued code, and profile updates roundtrip", () => {
  const mock = createMockApi();
  mock("/auth/doctor/signup/send", "POST", {
    phone: "07700000000",
    password: "demo-pass",
  });
  const input = {
    phone: "07700000000",
    code: "000000",
    firstName: "Demo",
    lastName: "Doctor",
    gender: "FEMALE",
    birthDate: "1990-01-01",
    specialty: "Demo care",
  };
  expect(mock("/auth/doctor/signup/confirm", "POST", input).success).toBe(
    false,
  );
  const token = unwrap<AuthResponse>(
    mock("/auth/doctor/signup/confirm", "POST", { ...input, code: "123456" }),
  ).token;
  expect(
    unwrap<Doctor>(mock("/doctors/me", "GET", undefined, token)).firstName,
  ).toBe("Demo");
  expect(
    unwrap<Doctor>(
      mock(
        "/doctors/me",
        "PATCH",
        { status: "INACTIVE", bio: "Fake biography" },
        token,
      ),
    ).status,
  ).toBe("INACTIVE");
});
