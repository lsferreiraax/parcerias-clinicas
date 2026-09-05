/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1F3864', light: '#2E75B6', dark: '#152744' },
        parceriaA: '#D6E4F0',
        parceriaB: '#D5E8D4',
        parceriaC: '#FFF2CC',
      }
    }
  },
  plugins: []
}
