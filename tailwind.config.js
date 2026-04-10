/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bolly: {
          50:  '#E0F2F1',
          100: '#B2DFDB',
          200: '#80CBC4',
          300: '#4DB6AC',
          400: '#26A69A',
          500: '#00897B',   // Teal Primary — bottoni, accenti, link
          600: '#00796B',   // Hover state
          700: '#00695C',   // Gradiente icona (basso)
          800: '#00574B',
          900: '#004D40',   // Teal Dark — alto contrasto
        }
      },
      fontFamily: {
        pacifico: ['Pacifico', 'cursive'],
      }
    }
  },
  plugins: [],
}
