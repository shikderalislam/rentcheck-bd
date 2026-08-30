/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2fbf6",
          100: "#e0f7e9",
          200: "#b9edcd",
          300: "#83dda8",
          400: "#4bc57e",
          500: "#26a85e",
          600: "#19894a",
          700: "#166d3d",
          800: "#155634",
          900: "#12472c",
        },
      },
      fontFamily: {
        sans: ["Inter", "Hind Siliguri", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)",
      },
    },
  },
  plugins: [],
};
