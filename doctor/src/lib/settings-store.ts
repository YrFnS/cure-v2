import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ar } from "./i18n/ar";
import { en } from "./i18n/en";

type Language = "ar" | "en";
interface Settings {
  language: Language;
  hydrated: boolean;
  setLanguage: (language: Language) => void;
}
export const useSettingsStore = create<Settings>()(
  persist(
    (set) => ({
      language: "ar",
      hydrated: false,
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "doctor-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ language: s.language }),
      onRehydrateStorage: () => () =>
        useSettingsStore.setState({ hydrated: true }),
    },
  ),
);
export function useTranslation() {
  const language = useSettingsStore((s) => s.language);
  return { language, isRTL: language === "ar", t: language === "ar" ? ar : en };
}
