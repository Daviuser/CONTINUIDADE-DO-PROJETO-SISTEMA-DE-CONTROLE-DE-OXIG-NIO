import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      verde: { 50: "#f0f8ee", 100: "#dcefd8", 200: "#b9dfb2", 500: "#3f9a35", 600: "#1e7a2e", 700: "#17632a", 800: "#124f22" },
      laranja: { 50: "#fff5ea", 100: "#ffe6c9", 500: "#f28a1e", 600: "#d9740a" },
      grafite: { 700: "#2b3a4a", 900: "#1c2733" },
    },
    fontFamily: {
      sans: ["var(--font-inter)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      display: ["var(--font-manrope)", "var(--font-inter)", "system-ui", "sans-serif"],
    },
    borderColor: { DEFAULT: "#e2e8e4" },
    boxShadow: {
      card: "0 1px 2px rgba(16,40,24,.05), 0 1px 1px rgba(16,40,24,.03)",
      pop: "0 12px 40px -12px rgba(16,40,24,.18), 0 2px 6px rgba(16,40,24,.05)",
    },
  }},
  plugins: [],
} satisfies Config;
