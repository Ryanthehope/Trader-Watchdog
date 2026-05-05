import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef3ff',
          100: '#dbe6ff',
          200: '#b8cbff',
          300: '#8aa8f5',
          400: '#5e7fda',
          500: '#325ebd',
          600: '#1E4499',
          700: '#17377b',
          800: '#102959',
          900: '#091b38',
        },
      },
    },
  },
  plugins: [],
};

export default config;
