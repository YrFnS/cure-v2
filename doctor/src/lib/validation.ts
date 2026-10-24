import type { SlotInput, Status } from "./types";
import { days } from "./types";

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validPhone(value: string): boolean {
  return /^(07\d{9}|(?:\+?964)7\d{9})$/.test(value.trim());
}
export function validBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    localDate(date) === value &&
    value < localDate() &&
    date.getFullYear() >= 1900
  );
}
export function scheduleError(
  slots: SlotInput[],
): "invalidSlot" | "overlap" | null {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const slot of slots) {
    if (
      !days.includes(slot.day) ||
      !time.test(slot.from) ||
      !time.test(slot.to) ||
      slot.from >= slot.to ||
      !Number.isInteger(slot.maxAppointments) ||
      slot.maxAppointments < 1 ||
      slot.maxAppointments > 50
    )
      return "invalidSlot";
  }
  for (const day of days) {
    const sorted = slots
      .filter((slot) => slot.day === day)
      .sort((a, b) => a.from.localeCompare(b.from));
    if (
      sorted.some(
        (slot, index) => index > 0 && slot.from < sorted[index - 1].to,
      )
    )
      return "overlap";
  }
  return null;
}
export function canTransition(
  from: Status,
  to: Exclude<Status, "SCHEDULED">,
): boolean {
  return (
    (from === "SCHEDULED" && to === "OPEN") ||
    (from === "OPEN" && to === "CLOSED") ||
    ((from === "SCHEDULED" || from === "OPEN") && to === "CANCELLED")
  );
}
export function isDoctor(value: {
  role?: string;
  user?: { role: string };
}): boolean {
  return (value.user?.role ?? value.role) === "DOCTOR";
}
