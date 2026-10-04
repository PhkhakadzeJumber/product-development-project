import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: { 50: "#f0fdfa", 600: "#0d9488", 700: "#0f766e" } },
      boxShadow: { card: "0 1px 3px rgb(0 0 0 / 0.06), 0 4px 16px rgb(0 0 0 / 0.06)" },
    },
  },
  plugins: [],
} satisfies Config;
