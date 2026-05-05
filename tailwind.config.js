/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef3ff",
          100: "#dbe6ff",
          200: "#b8cbff",
          300: "#8aa8f5",
          400: "#5e7fda",
          500: "#325ebd",
          600: "#1E4499",
          700: "#17377b",
          800: "#102959",
          900: "#091b38",
          950: "#040d1f",
        },
        accent: {
          50: "#f2ffe9",
          100: "#e0ffc8",
          200: "#c2ff93",
          300: "#9df95a",
          400: "#6ef126",
          500: "#39e600",
          600: "#2eb900",
          700: "#248d00",
          800: "#1d6b02",
          900: "#185504",
          950: "#0b2f00",
        },
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
      },
      fontFamily: {
        sans: [
          "DM Sans",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        display: ["Outfit", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "glow-brand": "0 0 80px -12px rgba(30, 68, 153, 0.45)",
        "card-lg": "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
        "grid-sm": "28px 28px",
      },
    },
  },
  plugins: [],
};
