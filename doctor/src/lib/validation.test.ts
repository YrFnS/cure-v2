import { expect, test } from "bun:test";
import { cn } from "./cn";
import {
  canTransition,
  isDoctor,
  localDate,
  scheduleError,
  validBirthDate,
  validPhone,
} from "./validation";
import type { SlotInput } from "./types";

const slot: SlotInput = {
  day: "SUN",
  from: "09:00",
  to: "12:00",
  maxAppointments: 10,
};
test("clinic date uses the local calendar, not UTC", () => {
  expect(localDate(new Date(2026, 0, 2, 0, 1))).toBe("2026-01-02");
});
test("phone and calendar dates validate user input", () => {
  for (const phone of ["07700000000", "+9647700000000", "9647700000000"])
    expect(validPhone(phone)).toBe(true);
  expect(validPhone("123")).toBe(false);
  expect(validBirthDate("2000-02-29")).toBe(true);
  for (const date of ["2001-02-29", "2000-13-01", "3000-01-01", "1990-2-01"])
    expect(validBirthDate(date)).toBe(false);
});
test("schedule rejects bad times, capacities and overlaps, accepts adjacent slots", () => {
  expect(scheduleError([])).toBeNull();
  expect(
    scheduleError([slot, { ...slot, from: "12:00", to: "13:00" }]),
  ).toBeNull();
  expect(scheduleError([slot, { ...slot, day: "MON" }])).toBeNull();
  expect(scheduleError([slot, { ...slot, from: "11:00", to: "13:00" }])).toBe(
    "overlap",
  );
  for (const patch of [
    { from: "24:00" },
    { from: "9:00" },
    { to: "08:00" },
    { to: "09:00" },
    { maxAppointments: 0 },
    { maxAppointments: 51 },
    { maxAppointments: 1.5 },
    { maxAppointments: NaN },
  ])
    expect(scheduleError([{ ...slot, ...patch }])).toBe("invalidSlot");
});
test("only contract status transitions are allowed", () => {
  expect(canTransition("SCHEDULED", "OPEN")).toBe(true);
  expect(canTransition("OPEN", "CLOSED")).toBe(true);
  expect(canTransition("OPEN", "CANCELLED")).toBe(true);
  expect(canTransition("SCHEDULED", "CLOSED")).toBe(false);
  expect(canTransition("CLOSED", "CANCELLED")).toBe(false);
  expect(canTransition("CANCELLED", "OPEN")).toBe(false);
});
test("doctor role is explicit and Arabic/English typography variants merge", () => {
  expect(isDoctor({ user: { role: "DOCTOR" } })).toBe(true);
  expect(isDoctor({ role: "PATIENT" })).toBe(false);
  expect(isDoctor({})).toBe(false);
  expect(cn("font-regular text-right", "font-bold text-center")).toBe(
    "font-bold text-center",
  );
});
