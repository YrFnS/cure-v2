/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  corePlugins: {
    space: false,
  },
  theme: {
    // NOTE to AI: You can extend the theme with custom colors or styles here.
    extend: {
      colors: {
        // Light Medical Theme - Professional Hospital Look
        // LIGHT MODE ONLY - No dark mode
        medical: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          cardAlt: '#F1F5F9',
          border: '#E2E8F0',
          primary: '#0891B2', // Teal
          primaryDark: '#0E7490',
          primaryLight: '#CFFAFE',
          secondary: '#0284C7', // Blue
          accent: '#06B6D4',
          success: '#059669',
          successLight: '#D1FAE5',
          warning: '#D97706',
          warningLight: '#FEF3C7',
          error: '#DC2626',
          errorLight: '#FEE2E2',
          text: '#0F172A',
          textSecondary: '#475569',
          textMuted: '#94A3B8',
        },
      },
      fontFamily: {
        cairo: ['Cairo_400Regular'],
        'cairo-medium': ['Cairo_500Medium'],
        'cairo-semibold': ['Cairo_600SemiBold'],
        'cairo-bold': ['Cairo_700Bold'],
      },
      // INCREASED FONT SIZES FOR BETTER READABILITY
      fontSize: {
        xs: "12px",      // Was 10px
        sm: "14px",      // Was 12px
        base: "16px",    // Was 14px
        lg: "18px",      // Same
        xl: "22px",      // Was 20px
        "2xl": "26px",   // Was 24px
        "3xl": "34px",   // Was 32px
        "4xl": "42px",   // Was 40px
        "5xl": "50px",   // Was 48px
        "6xl": "58px",   // Was 56px
        "7xl": "66px",   // Was 64px
        "8xl": "74px",   // Was 72px
        "9xl": "82px",   // Was 80px
      },
    },
  },
  // DISABLE DARK MODE COMPLETELY
  darkMode: "class",
  plugins: [
    plugin(({ matchUtilities, theme }) => {
      const spacing = theme("spacing");

      // space-{n}  ->  gap: {n}
      matchUtilities(
        { space: (value) => ({ gap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-x-{n}  ->  column-gap: {n}
      matchUtilities(
        { "space-x": (value) => ({ columnGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-y-{n}  ->  row-gap: {n}
      matchUtilities(
        { "space-y": (value) => ({ rowGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );
    }),
  ],
};
