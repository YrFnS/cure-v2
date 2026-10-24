import { afterEach, beforeEach, expect, mock, test } from "bun:test";

const storage = new Map<string, string>();
mock.module("./secure-storage", () => ({
  secureStorage: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: async (key: string) => {
      storage.delete(key);
    },
  },
}));
process.env.EXPO_PUBLIC_API_MOCK = "0";
const { api, getToken, storeToken, photoUrl } = await import("./api");
const {
  acceptSession,
  localLogout,
  queryClient,
  restoreSession,
  useAuthStore,
} = await import("./auth-store");
const originalFetch = globalThis.fetch;
const calls: { url: string; init?: RequestInit }[] = [];
let responder: (url: string, init?: RequestInit) => Response;
function response(data: unknown, status = 200) {
  return Response.json({ success: true, data }, { status });
}
beforeEach(() => {
  storage.clear();
  calls.length = 0;
  queryClient.clear();
  useAuthStore.setState({ authenticated: false });
  responder = () => response({ role: "DOCTOR" });
  globalThis.fetch = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    calls.push({ url: String(url), init });
    return responder(String(url), init);
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});
test("client sends bearer auth, unwraps envelope, and does not resend a failed mutation", async () => {
  await storeToken("fake-session");
  responder = () => response({ slots: [] });
  expect(await api.schedule()).toEqual({ slots: [] });
  expect(new Headers(calls[0].init?.headers).get("Authorization")).toBe(
    "Bearer fake-session",
  );
  responder = () =>
    Response.json(
      { success: false, statusCode: 400, message: "Invalid transition" },
      { status: 400 },
    );
  await expect(api.status("visit-1", "CLOSED")).rejects.toThrow(
    "Invalid transition",
  );
  expect(calls.filter((call) => call.init?.method === "PATCH")).toHaveLength(1);
  expect(JSON.parse(String(calls[1].init?.body))).toEqual({ status: "CLOSED" });
});
test("malformed server envelopes fail clearly instead of crashing a screen", async () => {
  responder = () => Response.json(null);
  await expect(api.profile()).rejects.toThrow("Invalid server response");
  responder = () => Response.json({ unexpected: true });
  await expect(api.profile()).rejects.toThrow("Invalid server response");
});
test("non-doctor login cannot persist a session", async () => {
  responder = () => response({ role: "PATIENT" });
  await expect(
    acceptSession({ token: "fake-session", role: "PATIENT" }),
  ).rejects.toThrow("doctors only");
  expect(await getToken()).toBeNull();
  expect(useAuthStore.getState().authenticated).toBe(false);
});
test("doctor session survives restore, while logout removes cached patient data", async () => {
  await acceptSession({ token: "fake-session", user: { role: "DOCTOR" } });
  expect(useAuthStore.getState().authenticated).toBe(true);
  useAuthStore.setState({ authenticated: false });
  expect(await restoreSession()).toBe(true);
  queryClient.setQueryData(
    ["appointments"],
    [{ patient: { name: "Fake patient" } }],
  );
  await localLogout();
  expect(await getToken()).toBeNull();
  expect(queryClient.getQueryData(["appointments"])).toBeUndefined();
  expect(useAuthStore.getState().authenticated).toBe(false);
});
test("an expired session clears authentication; network failure keeps a restorable token", async () => {
  await storeToken("fake-session");
  responder = () => {
    throw new Error("offline");
  };
  await expect(restoreSession()).rejects.toThrow("Network request failed");
  expect(await getToken()).toBe("fake-session");
  responder = () =>
    Response.json(
      { success: false, statusCode: 401, message: "Expired" },
      { status: 401 },
    );
  expect(await restoreSession()).toBe(false);
  expect(await getToken()).toBeNull();
});
test("photo URLs preserve private signed links and device-only demo previews", () => {
  expect(photoUrl("/api/files?sig=demo")).toContain("/api/files?sig=demo");
  expect(photoUrl("blob:demo-preview")).toBe("blob:demo-preview");
  expect(photoUrl("file:///demo.png")).toBe("file:///demo.png");
  expect(photoUrl("data:image/png;base64,ZGVtbw==")).toBe(
    "data:image/png;base64,ZGVtbw==",
  );
  expect(photoUrl(null)).toBeUndefined();
});
test("photo upload uses the contract multipart field without a JSON content type", async () => {
  await storeToken("fake-session");
  responder = () => response({ photoUrl: "/api/files?fake=signed-demo" });
  const file = new File(["fake image bytes"], "demo.png", {
    type: "image/png",
  });
  await api.photo({ uri: "blob:demo", file });
  expect(calls[0].url.endsWith("/doctors/me/photo")).toBe(true);
  expect(new Headers(calls[0].init?.headers).has("Content-Type")).toBe(false);
  expect(calls[0].init?.body).toBeInstanceOf(FormData);
  expect((calls[0].init?.body as FormData).get("photo")).toBeInstanceOf(File);
});
test("signup and schedule calls send exactly the shared contract fields", async () => {
  responder = () => response({ sent: true });
  await api.signupSend("07700000000", "fake-password");
  expect(JSON.parse(String(calls[0].init?.body))).toEqual({
    phone: "07700000000",
    password: "fake-password",
  });
  const profile = {
    phone: "07700000000",
    code: "123456",
    firstName: "Fake",
    lastName: "Doctor",
    birthDate: "1985-06-15",
    gender: "MALE" as const,
  };
  responder = () =>
    response({ token: "fake-session", user: { role: "DOCTOR" } });
  await api.signupConfirm(profile);
  expect(JSON.parse(String(calls[1].init?.body))).toEqual(profile);
  await storeToken("fake-session");
  responder = () => response({ slots: [] });
  await api.saveSchedule([]);
  expect(calls[2].init?.method).toBe("PUT");
  expect(JSON.parse(String(calls[2].init?.body))).toEqual({ slots: [] });
});
