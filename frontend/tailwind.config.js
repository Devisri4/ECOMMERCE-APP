/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // 👈 all React component files
  ],
  theme: {
    extend: {
      colors: {
        ink: '#111111',     // primary text, buttons
        paper: '#FAF9F7',   // page background (off-white)
        blush: '#FFDAD6',   // matches the hero image backdrop
      },
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Prata', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
