import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: {
    verde: { 50:"#f1f8ec", 100:"#dcefd0", 500:"#5aa832", 600:"#3f8f24", 700:"#2f7019" },
    laranja: { 50:"#fff4e8", 500:"#f28a1e", 600:"#e07400" },
    grafite: { 700:"#2b3a4a", 900:"#1c2733" },
  }}},
  plugins: [],
} satisfies Config;
