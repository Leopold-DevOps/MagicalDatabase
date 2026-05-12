import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#ffffff",
          100: "#f7f1ff",
          200: "#ece1ff",
          300: "#cebcf2",
          400: "#9c87cf",
          500: "#7461a8",
          600: "#52447f",
          700: "#3c2e62",
          800: "#241848",
          900: "#160e33",
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
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
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
        glow: "0 0 0 1px rgba(167, 139, 250, 0.22), 0 10px 40px -10px rgba(168, 85, 247, 0.45)",
        "glow-gold":
          "0 0 0 1px rgba(251, 191, 36, 0.30), 0 10px 30px -8px rgba(251, 191, 36, 0.45)",
      },
      animation: {
        "fade-in-up": "fade-in-up 0.35s ease-out both",
        shimmer: "shimmer 1.6s infinite",
        "twinkle-slow": "twinkle 6s ease-in-out infinite",
        "foil-sweep": "foil-sweep 5s linear infinite",
        "foil-shine": "foil-shine 5s ease-in-out infinite",
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
        "foil-sweep": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "280% 50%" },
        },
        "foil-shine": {
          "0%, 100%": { backgroundPosition: "-75% -75%" },
          "50%": { backgroundPosition: "175% 175%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
