import type { Config } from "tailwindcss";

// Tokens from docs/design.md §1. Accent is PondScale blue (#0B63CE).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F7F8FA",
        surface: "#FFFFFF",
        border: "#E4E7EC",
        text: "#101828",
        muted: "#475467",
        success: { DEFAULT: "#1B7F3B", bg: "#E7F6EC" },
        warning: { DEFAULT: "#B54708", bg: "#FEF0C7" },
        danger: { DEFAULT: "#B42318", bg: "#FEE4E2" },
        info: { DEFAULT: "#175CD3", bg: "#D1E9FF" },
        accent: "#0B63CE",
      },
      borderRadius: {
        input: "8px",
        card: "12px",
        dialog: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.10)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;