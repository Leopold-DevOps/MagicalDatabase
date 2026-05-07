import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#fdfcff",
          100: "#f4eeff",
          200: "#e3d8fa",
          300: "#c5b3ed",
          400: "#9c87cf",
          500: "#7461a8",
          600: "#52447f",
          700: "#382b5b",
          800: "#221742",
          900: "#150d2e",
          950: "#0c071f",
        },
        violet: {
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        rose: {
          300: "#fda4af",
          400: "#fb7185",
        },
        gold: {
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
        },
      },
      fontFamily: {
        display: ["Cinzel", "ui-serif", "Georgia", "serif"],
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        ring: "0 0 0 1px rgba(139, 92, 246, 0.4)",
        soft: "0 1px 0 rgba(255,255,255,0.05) inset, 0 12px 40px rgba(8, 5, 22, 0.55)",
        glow: "0 0 0 1px rgba(167, 139, 250, 0.18), 0 10px 40px -10px rgba(168, 85, 247, 0.35)",
      },
      animation: {
        "fade-in-up": "fade-in-up 0.35s ease-out both",
        shimmer: "shimmer 1.6s infinite",
        "twinkle-slow": "twinkle 6s ease-in-out infinite",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
