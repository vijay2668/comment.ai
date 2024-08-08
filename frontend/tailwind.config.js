/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  themes: ["luxury", "dark", "cmyk"],
  plugins: [require('daisyui')],
}