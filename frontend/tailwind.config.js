/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3713EC",
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
          page: "#F5F6FA", // Light gray background
          sidebar: "#FFFFFF",
        }
      },
      fontFamily: {
        sans: [
          '"Source Han Sans CN"',
          '"Noto Sans SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
};
