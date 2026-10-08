/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        counterpart: '#d9482b', // warm red: the opponent
        coach: '#2f6fdb',       // blue: live feedback
        debrief: '#b7791f',     // amber: the scorecard
        ok: '#2e8b57',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}