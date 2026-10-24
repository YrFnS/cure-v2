import { useSettingsStore, useTranslation } from "@/lib/settings-store";
import { Button } from "./ui";
export function LanguageButton() {
  const { language } = useTranslation();
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  return (
    <Button
      title={language === "ar" ? "English" : "العربية"}
      variant="ghost"
      onPress={() => setLanguage(language === "ar" ? "en" : "ar")}
    />
  );
}
