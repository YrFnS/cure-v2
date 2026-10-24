import { createMockApi } from "./mock";
import { secureStorage } from "./secure-storage";
import type {
  Appointment,
  AuthResponse,
  Doctor,
  Envelope,
  ProfilePatch,
  Signup,
  Slot,
  SlotInput,
  Status,
} from "./types";

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");
export const API_MOCK = process.env.EXPO_PUBLIC_API_MOCK === "1";
const TOKEN_KEY = API_MOCK ? "doctor-demo-token" : "doctor-auth-token";
const mockRequest = createMockApi();
export const getToken = () => secureStorage.getItem(TOKEN_KEY);
export const storeToken = (token: string) =>
  secureStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => secureStorage.removeItem(TOKEN_KEY);
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let onUnauthorized: (() => void) | undefined;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  explicitToken?: string,
): Promise<T> {
  const token = explicitToken ?? (await getToken());
  let envelope: Envelope<T>;
  let status = 200;
  if (API_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    envelope = mockRequest(path, method, body, token) as Envelope<T>;
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const multipart = body instanceof FormData;
      const response = await fetch(`${API_URL}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          ...(multipart ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body:
          body === undefined
            ? undefined
            : multipart
              ? body
              : JSON.stringify(body),
      });
      status = response.status;
      envelope = await response.json();
      if (!envelope || typeof envelope !== "object")
        throw new ApiError(status, "Invalid server response");
      if (!response.ok && envelope.success !== false)
        throw new ApiError(status, "Request failed");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      // Do not include URLs, payloads, or credentials in errors or logs.
      throw new ApiError(
        0,
        "Network request failed. Check your connection and retry. / تعذر الاتصال بالخادم. حاول مجدداً.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  if (envelope.success === false) {
    const code = envelope.statusCode ?? status;
    if (code === 401 && !path.startsWith("/auth/")) onUnauthorized?.();
    throw new ApiError(
      code,
      Array.isArray(envelope.message)
        ? envelope.message.join("\n")
        : envelope.message,
    );
  }
  if (envelope.success !== true || !("data" in envelope))
    throw new ApiError(status, "Invalid server response");
  return envelope.data;
}

export const api = {
  login: (phone: string, password: string) =>
    request<AuthResponse>("/auth/login", "POST", {
      phone: phone.trim(),
      password,
    }),
  signupSend: (phone: string, password: string) =>
    request<{ sent: true }>("/auth/doctor/signup/send", "POST", {
      phone: phone.trim(),
      password,
    }),
  signupConfirm: (input: Signup) =>
    request<AuthResponse>("/auth/doctor/signup/confirm", "POST", input),
  me: (token?: string) =>
    request<{ role: string }>("/users/me", "GET", undefined, token),
  logout: (token?: string) =>
    request<{ ok: true }>("/auth/logout", "POST", undefined, token),
  profile: (token?: string) =>
    request<Doctor>("/doctors/me", "GET", undefined, token),
  updateProfile: (patch: ProfilePatch) =>
    request<Doctor>("/doctors/me", "PATCH", patch),
  schedule: () => request<{ slots: Slot[] }>("/doctors/me/schedule"),
  saveSchedule: (slots: SlotInput[]) =>
    request<{ slots: Slot[] }>("/doctors/me/schedule", "PUT", { slots }),
  appointments: (
    filters: { from?: string; to?: string; status?: Status } = {},
  ) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters))
      if (value) params.set(key, value);
    return request<Appointment[]>(`/doctors/me/appointments?${params}`);
  },
  stats: (date: string) =>
    request<{ appointments: number; patients: number }>(
      `/doctors/me/stats?date=${encodeURIComponent(date)}`,
    ),
  status: (id: string, status: Exclude<Status, "SCHEDULED">) =>
    request<Appointment>(
      `/appointments/${encodeURIComponent(id)}/status`,
      "PATCH",
      { status },
    ),
  photo: async (asset: {
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
    file?: File;
  }) => {
    const form = new FormData();
    if (asset.file) form.append("photo", asset.file);
    else
      // SAFETY: React Native FormData accepts URI parts; its shared DOM type only declares Blob.
      form.append("photo", {
        uri: asset.uri,
        name: asset.fileName ?? "photo.jpg",
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as Blob);
    return request<Doctor>("/doctors/me/photo", "POST", form);
  },
};

export function photoUrl(value: string | null): string | undefined {
  if (!value) return undefined;
  if (/^(https?:\/\/|blob:|data:|file:)/.test(value)) return value;
  return `${API_URL.replace(/\/api$/, "")}${value.startsWith("/") ? "" : "/"}${value}`;
}
