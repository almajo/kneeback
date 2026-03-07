/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#FF6B35", light: "#FF8F5E", dark: "#E55A2B" },
        secondary: { DEFAULT: "#2EC4B6", light: "#5EDDD1", dark: "#1FA99C" },
        background: "#FFF8F0",
        surface: { DEFAULT: "#FFFFFF", alt: "#FFF0E5" },
        rest: "#7E57C2",
        border: { DEFAULT: "#E8E0D8", light: "#F0EAE2" },
      },
      borderRadius: {
        xl: "16px",
        "2xl": "24px",
      },
    },
  },
  plugins: [],
};
