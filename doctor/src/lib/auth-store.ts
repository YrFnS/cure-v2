import { create } from "zustand";
import { QueryClient } from "@tanstack/react-query";
import {
  api,
  ApiError,
  clearToken,
  getToken,
  setUnauthorizedHandler,
  storeToken,
} from "./api";
import type { AuthResponse } from "./types";
import { isDoctor } from "./validation";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
    mutations: { retry: false },
  },
});
export const useAuthStore = create<{ authenticated: boolean }>(() => ({
  authenticated: false,
}));
function forgetSession() {
  useAuthStore.setState({ authenticated: false });
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== "session",
  });
  queryClient.setQueryData(["session"], false);
}
export async function localLogout() {
  await clearToken();
  forgetSession();
}
setUnauthorizedHandler(() => {
  forgetSession();
  void clearToken().catch(() => {
    /* The next launch revalidates any surviving token. */
  });
});
export async function restoreSession(): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  try {
    const user = await api.me(token);
    if (!isDoctor(user)) {
      await localLogout();
      return false;
    }
    useAuthStore.setState({ authenticated: true });
    return true;
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      await localLogout();
      return false;
    }
    throw error;
  }
}
export async function acceptSession(result: AuthResponse): Promise<void> {
  if (!result.token) throw new Error("Invalid session");
  // Revalidate on the server before storing any authenticated state.
  const user = await api.me(result.token);
  if (!isDoctor(user)) {
    await api.logout(result.token).catch(() => {});
    throw new Error("This app is for doctors only. / هذا التطبيق للأطباء فقط.");
  }
  await storeToken(result.token);
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== "session",
  });
  queryClient.setQueryData(["session"], true);
  useAuthStore.setState({ authenticated: true });
}
export async function logout(): Promise<void> {
  try {
    await api.logout();
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
  }
  await localLogout();
}
