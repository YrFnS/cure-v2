export const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type Day = (typeof days)[number];
export type Gender = "MALE" | "FEMALE";
export type Status = "SCHEDULED" | "OPEN" | "CLOSED" | "CANCELLED";
export interface Doctor {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  nameAr: string | null;
  specialty: string | null;
  bio: string | null;
  gender: Gender;
  birthDate: string;
  phone: string;
  photoUrl: string | null;
  hospital: { id: string; name: string } | null;
  status: "ACTIVE" | "INACTIVE";
}
export type ProfilePatch = Partial<
  Pick<
    Doctor,
    | "firstName"
    | "lastName"
    | "nameAr"
    | "specialty"
    | "bio"
    | "gender"
    | "status"
  >
> & { hospitalId?: string };
export interface SlotInput {
  day: Day;
  from: string;
  to: string;
  maxAppointments: number;
}
export interface Slot extends SlotInput {
  id: string;
}
export interface Appointment {
  id: string;
  date: string;
  slot: Pick<Slot, "id" | "day" | "from" | "to">;
  status: Status;
  createdAt: string;
  patient: {
    id: string;
    name: string;
    gender: Gender | null;
    age: number | null;
  };
  doctor: {
    id: string;
    name: string;
    nameAr: string | null;
    specialty: string | null;
    photoUrl: string | null;
    hospital: Doctor["hospital"];
  };
}
export interface Signup {
  phone: string;
  code: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: string;
  specialty?: string;
  hospitalId?: string;
}
export interface AuthResponse {
  token: string;
  role?: string;
  user?: { id?: string; role: string };
}
export type Envelope<T> =
  | { success: true; data: T }
  | { success: false; statusCode: number; message: string | string[] };
