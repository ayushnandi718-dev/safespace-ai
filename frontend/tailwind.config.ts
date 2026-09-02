import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          200: "#bac8ff",
          300: "#91a7ff",
          400: "#748ffc",
          500: "#5c7cfa",
          600: "#4c6ef5",
          700: "#4263eb",
          800: "#3b5bdb",
          900: "#364fc7",
        },
        surface: {
          0: "#080A12",
          1: "#12121a",
          2: "#1a1a26",
          3: "#22222e",
          4: "#2a2a3a",
        },
        accent: {
          blue: "#60a5fa",
          violet: "#a78bfa",
          teal: "#2dd4bf",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "typing-dot": {
          "0%, 60%, 100%": { opacity: "0.2", transform: "scale(0.8)" },
          "30%": { opacity: "1", transform: "scale(1)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        orbit: {
          from: { transform: "rotate(0deg) translateX(60px) rotate(0deg)" },
          to: { transform: "rotate(360deg) translateX(60px) rotate(-360deg)" },
        },
        "orbit-reverse": {
          from: { transform: "rotate(360deg) translateX(45px) rotate(-360deg)" },
          to: { transform: "rotate(0deg) translateX(45px) rotate(0deg)" },
        },
      },
      animation: {
        "typing-dot": "typing-dot 1.4s infinite ease-in-out",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.3s ease-out forwards",
        "slide-in-up": "slide-in-up 0.4s ease-out forwards",
        shimmer: "shimmer 2s infinite linear",
        orbit: "orbit 8s linear infinite",
        "orbit-reverse": "orbit-reverse 6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
