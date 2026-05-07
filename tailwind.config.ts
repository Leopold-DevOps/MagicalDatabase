import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        arcane: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
          950: "#2e0a4f",
        },
        midnight: {
          900: "#0d0420",
          800: "#150734",
          700: "#1c0a47",
        },
      },
      fontFamily: {
        display: ["Cinzel", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 30px rgba(168, 85, 247, 0.35)",
        "glow-lg": "0 0 60px rgba(168, 85, 247, 0.45)",
      },
      backgroundImage: {
        "arcane-radial":
          "radial-gradient(circle at 30% 10%, rgba(168,85,247,0.25), transparent 50%), radial-gradient(circle at 80% 80%, rgba(126,34,206,0.25), transparent 55%)",
      },
    },
  },
  plugins: [],
};

export default config;
