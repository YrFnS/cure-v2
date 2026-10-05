import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Patient } from './types';
import { secureStorage } from './secure-storage';
import {
  clearToken,
  fetchProfile,
  getToken,
  login,
  storeToken,
} from './api';

interface AuthState {
  isAuthenticated: boolean;
  patient: Patient | null;
  isLoading: boolean;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  refreshProfile: () => Promise<void>;
  login: (
    mrn: string,
    secret: string,
    isFirstLogin?: boolean,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updatePatient: (patient: Partial<Patient>) => void;
}

function isMeaningful(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function looksLikePatient(value: any): boolean {
  if (!isObject(value)) return false;
  return Boolean(
    value.mrn ||
    value.phone ||
    value.name ||
    value.nameAr ||
    value.fullName ||
    value.fullNameAr ||
    value.dateOfBirth
  );
}

function unwrapPatientNode(raw: any): any {
  if (!isObject(raw)) return null;
  if (looksLikePatient(raw)) return raw;

  const directCandidates = [
    raw.patient,
    raw.profile,
    raw.patientProfile,
    raw.userProfile,
    raw.me,
    raw.data,
  ];

  for (const candidate of directCandidates) {
    if (looksLikePatient(candidate)) return candidate;
  }

  const deepCandidates = [
    raw.user,
    raw.account,
    raw.payload,
    raw.result,
    raw.response,
  ];

  for (const candidate of deepCandidates) {
    if (!isObject(candidate)) continue;
    const unwrapped = unwrapPatientNode(candidate);
    if (unwrapped) return unwrapped;
  }

  return null;
}

function normalizePatient(raw: any): Patient | null {
  const patientNode = unwrapPatientNode(raw);
  if (!patientNode) return null;

  const fallbackName =
    patientNode.nameAr ??
    patientNode.name ??
    patientNode.fullNameAr ??
    patientNode.fullName ??
    patientNode.displayName ??
    '';

  return {
    ...patientNode,
    nameAr: patientNode.nameAr ?? patientNode.fullNameAr ?? patientNode.name ?? patientNode.fullName ?? '',
    name: patientNode.name ?? patientNode.fullName ?? patientNode.nameAr ?? patientNode.fullNameAr ?? '',
    mrn: patientNode.mrn ?? '',
    phone: patientNode.phone ?? '',
    address: patientNode.address ?? '',
    emergencyContact:
      patientNode.emergencyContact ??
      patientNode.emergencyPhone ??
      patientNode.emergencyNumber ??
      patientNode.emergencyMobile ??
      patientNode.emergencyTel ??
      patientNode.emergency_contact_phone ??
      patientNode.emergencyPhoneNumber ??
      patientNode.emergency_contact ??
      '',
    bloodType: patientNode.bloodType ?? '',
    maritalStatus:
      patientNode.maritalStatus ??
      patientNode.marital_status ??
      patientNode.maritalStatusArabic ??
      patientNode.marital_status_arabic ??
      '',
    dateOfBirth: patientNode.dateOfBirth ?? '',
    gender: (patientNode.gender === 'male' || patientNode.gender === 'female' ? patientNode.gender : '') as any,
    chronicConditions: patientNode.chronicConditions ?? [],
    allergies: patientNode.allergies ?? [],
    connectedHospitals: patientNode.connectedHospitals ?? [],
    displayName: patientNode.displayName ?? fallbackName,
  } as Patient;
}

function mergePatients(primary: Patient | null, fallback: Patient | null): Patient | null {
  if (!primary && !fallback) return null;
  if (!primary) return fallback;
  if (!fallback) return primary;

  const merged = { ...fallback, ...primary } as Patient & Record<string, any>;
  const keys = new Set([...Object.keys(primary), ...Object.keys(fallback)]);

  for (const key of keys) {
    const primaryValue = (primary as any)[key];
    const fallbackValue = (fallback as any)[key];
    if (!isMeaningful(primaryValue) && isMeaningful(fallbackValue)) {
      merged[key] = fallbackValue;
    }
  }

  return normalizePatient(merged);
}

function extractAuthToken(payload: any): string | null {
  if (!payload || typeof payload !== 'object') return null;
  return (
    payload.token ??
    payload.accessToken ??
    payload.jwt ??
    payload.authToken ??
    null
  );
}

function extractPatientPayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return null;
  return (
    payload.patient ??
    payload.profile ??
    payload.patientProfile ??
    payload.user?.patientProfile ??
    payload.userProfile ??
    payload.me ??
    payload.user ??
    payload.data?.patient ??
    payload.data?.profile ??
    payload.data?.patientProfile ??
    null
  );
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      patient: null,
      isLoading: false,
      hasHydrated: false,

      setHasHydrated: (value: boolean) => {
        set({ hasHydrated: value });
      },

      refreshProfile: async () => {
        try {
          const token = await getToken();
          if (!token) return;
          const profile = await fetchProfile(token);
          const normalized = normalizePatient(profile);
          if (normalized) {
            set((state) => ({
              patient: mergePatients(normalized, state.patient),
              isAuthenticated: true,
            }));
          }
        } catch (error) {
          // A dead session (e.g. iOS Keychain surviving a reinstall) must not keep the user "logged in".
          if (error instanceof Error && /^HTTP 401\b/.test(error.message)) {
            await get().logout();
          }
        }
      },

      login: async (mrn: string, secret: string, isFirstLogin = false) => {
        set({ isLoading: true });

        try {
          const mode = isFirstLogin ? 'first' : 'password';
          const result = await login(mrn, secret, mode);
          const tokenFromLogin = extractAuthToken(result);
          const patientFromLogin = extractPatientPayload(result);

          if (!tokenFromLogin) {
            set({ isLoading: false });
            return {
              success: false,
              error: 'تعذر الحصول على بيانات تسجيل الدخول من الخادم',
            };
          }

          await storeToken(tokenFromLogin);

          const normalizedFromLogin = normalizePatient(patientFromLogin);
          if (normalizedFromLogin) {
            set({
              isAuthenticated: true,
              patient: normalizedFromLogin,
              isLoading: false,
            });

            // RootLayoutNav owns the single post-login profile refresh.
            return { success: true };
          }

          let normalizedFromProfile: Patient | null = null;
          try {
            const profile = await fetchProfile(tokenFromLogin);
            normalizedFromProfile = normalizePatient(profile);
          } catch (error) {
            void error;
          }

          if (!normalizedFromProfile) {
            set({ isLoading: false });
            return {
              success: false,
              error: 'تم تسجيل الدخول لكن بيانات المريض غير متاحة حالياً',
            };
          }

          set({
            isAuthenticated: true,
            patient: normalizedFromProfile,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Login failed',
          };
        }
      },

      logout: async () => {
        const token = await getToken();
        await clearToken();
        void token;
        set({
          isAuthenticated: false,
          patient: null,
        });
      },

      updatePatient: (updates: Partial<Patient>) => {
        const currentPatient = get().patient;
        if (currentPatient) {
          set({
            patient: normalizePatient({ ...currentPatient, ...updates }),
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      onRehydrateStorage: () => (state) => {
        const hydratedState = state ?? useAuthStore.getState();
        if (hydratedState.patient) {
          hydratedState.patient = normalizePatient(hydratedState.patient);
        }
        hydratedState.setHasHydrated(true);
        // Profile refresh on cold start is handled once by RootLayoutNav after
        // hydration; calling it here too would double every startup GET /users/me.
      },
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        patient: state.patient,
      }),
    },
  ),
);
