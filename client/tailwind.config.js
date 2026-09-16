/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf7f4',
          100: '#f5eee8',
          200: '#ebdcd0',
          300: '#ddc2b0',
          400: '#caa28c',
          500: '#ba856d',
          600: '#ac725b',
          700: '#8f5c49',
          800: '#754d3e',
          900: '#604135',
          950: '#34211a',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      }
    },
  },
  plugins: [],
}
