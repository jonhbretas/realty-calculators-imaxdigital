/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#002855', // Azul Rowan Kardos [cite: 75]
        secondary: '#F2A900', // Dourado Rowan Kardos [cite: 77]
      },
    },
  },
  plugins: [],
}