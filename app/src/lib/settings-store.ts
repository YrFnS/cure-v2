import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { ar } from './i18n/ar';
import { en } from './i18n/en';

type Language = 'ar' | 'en';
type Theme = 'light' | 'dark';

// Derive the initial language from the device locale, but only when the user
// has no stored preference. zustand's persist rehydrates from AsyncStorage after
// this initial value is set, so a stored choice (including an explicit 'ar')
// correctly overrides the device default instead of the other way around.
function getDeviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    if (!code) return 'en';
    return code === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

interface SettingsState {
  language: Language;
  languagePreference: Language | null;
  notificationsEnabled: boolean;
  theme: Theme;
  setLanguage: (lang: Language) => void;
  toggleNotifications: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: getDeviceLanguage(),
      languagePreference: null,
      notificationsEnabled: true,
      theme: 'light',

      setLanguage: (lang: Language) => {
        set({ language: lang, languagePreference: lang });
      },

      toggleNotifications: () => {
        set({ notificationsEnabled: !get().notificationsEnabled });
      },
      setTheme: (theme: Theme) => {
        set({ theme });
      },
      toggleTheme: () => {
        set({ theme: get().theme === 'dark' ? 'light' : 'dark' });
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: () => ({} as SettingsState),
      partialize: state => ({
        languagePreference: state.languagePreference,
        notificationsEnabled: state.notificationsEnabled,
        theme: state.theme,
      } as SettingsState),
      merge: (persisted, current) => {
        const stored = persisted as Partial<SettingsState>;
        const languagePreference = stored.languagePreference ?? null;
        return {
          ...current,
          language: languagePreference ?? current.language,
          languagePreference,
          notificationsEnabled: stored.notificationsEnabled ?? current.notificationsEnabled,
          theme: stored.theme ?? current.theme,
        };
      },
    }
  )
);

export const translations = { ar, en };

export const useTranslation = () => {
  const language = useSettingsStore(s => s.language);
  const t = translations[language];
  const isRTL = language === 'ar';

  return { t, isRTL, language };
};
