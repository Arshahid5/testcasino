/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'casino-dark': '#0f212e',
        'casino-blue': '#1a2c38',
        'casino-green': '#00e701',
      }
    },
  },
  plugins: [],
}
