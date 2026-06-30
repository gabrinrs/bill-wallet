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
        },
        // Token brand oltre al teal: corallo = stati scaduta/anomalia · social = aree amici/split/movimenti
        // (in scadenza / pagata restano i Tailwind amber-* / green-*; rosso = azioni distruttive)
        corallo: {  // scaduta / anomalia importo — Material Deep Orange
          50:  '#FBE9E7', 100: '#FFCCBC', 200: '#FFAB91', 300: '#FF8A65',
          400: '#FF7043', 500: '#FF5722', 600: '#F4511E', 700: '#E64A19',
          800: '#D84315', 900: '#BF360C',
        },
        social: {  // accento aree social — amici / split / movimenti (viola)
          50:  '#FAF5FF', 100: '#F3E8FF', 200: '#E9D5FF', 300: '#D8B4FE',
          400: '#C084FC', 500: '#A855F7', 600: '#9333EA', 700: '#7E22CE',
          800: '#6B21A8', 900: '#581C87',
        },
      },
      fontFamily: {
        pacifico: ['Pacifico', 'cursive'],
      }
    }
  },
  plugins: [],
}
