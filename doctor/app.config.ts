import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Cure Doctor",
  slug: "cure-doctor",
  description: "Doctor appointments and weekly clinic schedules / كيور دكتور",
  scheme: "curedoctor",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  newArchEnabled: false,
  icon: "./assets/images/logo.png",
  ios: {
    bundleIdentifier: "com.e2next.curedoctor",
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleAllowMixedLocalizations: true,
      CFBundleLocalizations: ["ar", "en"],
    },
  },
  android: { package: "com.e2next.curedoctor" },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/images/logo.png",
  },
  locales: { ar: "./locales/ar.json", en: "./locales/en.json" },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-font",
    [
      "expo-localization",
      { supportedLocales: { ios: ["ar", "en"], android: ["ar", "en"] } },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-screen.png",
        imageWidth: 240,
        resizeMode: "contain",
        backgroundColor: "#f0f4ff",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow Cure Doctor to choose your profile photo.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
  ],
  extra: {
    supportsRTL: true,
    eas: { projectId: "6cfdb59a-c0b9-4829-a364-814eda47382b" },
  },
};
export default config;
