/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // 👈 all React component files
  ],
  theme: {
    extend: {}, // you can customize theme later (colors, fonts, etc.)
  },
  plugins: [],
}
