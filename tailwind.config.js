/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mobiss': {
          primary: '#3D9A8B',
          dark: '#2D7A6D',
          light: '#4DB8A7',
          accent: '#5FCECE',
        }
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
