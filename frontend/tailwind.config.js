/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3713EC",
        "background-light": '#ffffff',
        "background-dark": '#121212',
        "surface-light": '#FFFFFF',
        "surface-dark": '#1F2937',
        "text-primary-light": '#0F172A',
        "text-primary-dark": '#F8FAFC',
        "text-secondary-light": '#64748B',
        "text-secondary-dark": '#94A3B8',
        "border-light": '#E2E8F0',
        "border-dark": '#334155',
        brand: {
          DEFAULT: "#6C5CFF",
          dark: "#4C3BFF",
          light: "#8F84FF",
        },
        accent: {
          green: "#56C271",
          red: "#FF5A5A",
          orange: "#FFA62B",
        },
        bg: {
          page: "#F5F6FA",
          sidebar: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: [
          '"Source Han Sans CN"',
          '"Noto Sans SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
      },
      borderRadius: {
        DEFAULT: "12px",
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
};
