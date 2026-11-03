/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      colors: {
        // Глубокий фиолетовый — основной цвет бренда (#5B3FA8 = 600)
        violet: {
          50: '#f5f2fc',
          100: '#ebe5f8',
          200: '#d6caf0',
          300: '#b7a3e3',
          400: '#9175d1',
          500: '#7454bd',
          600: '#5b3fa8',
          700: '#4b338c',
          800: '#3c2a6f',
          900: '#2c1f52',
          950: '#1c1336',
        },
        // Мягкий персиковый — тёплый акцент (#FFC498 = 300)
        peach: {
          50: '#fff8f2',
          100: '#ffeedf',
          200: '#ffdcc0',
          300: '#ffc498',
          400: '#fba870',
          500: '#f08a4b',
          600: '#d96c2e',
        },
        ink: '#1d1830',
        cream: '#fcfaf7',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(44 31 82 / 0.04), 0 12px 32px -16px rgb(44 31 82 / 0.14)',
        lift: '0 2px 6px rgb(44 31 82 / 0.05), 0 28px 56px -28px rgb(44 31 82 / 0.32)',
        glow: '0 12px 32px -12px rgb(91 63 168 / 0.55)',
      },
    },
  },
  plugins: [],
};
