/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#5c85d9",
        indigo: "#3F51B5",
        canvas: "#f0f4ff",
        soft: "#e3e9f6",
        ink: "#2D3142",
        muted: "#667085",
        success: "#4CAF50",
        danger: "#D32F2F",
      },
      fontFamily: {
        regular: ["CairoRegular"],
        medium: ["CairoMedium"],
        semibold: ["CairoSemiBold"],
        bold: ["CairoBold"],
        din: ["DINArabic"],
      },
    },
  },
  plugins: [],
};
