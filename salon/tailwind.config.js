/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Единственный акцент — глубокий изумруд #097969
        accent: {
          50: '#ebf7f4',
          100: '#cdeee6',
          200: '#9fdccd',
          300: '#63c2ac',
          400: '#2ea58c',
          500: '#0f8c76',
          600: '#097969',
          700: '#0a6156',
          800: '#0c4d45',
          900: '#0b3f39',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(15 23 42 / 0.12)',
        lift: '0 2px 4px rgb(15 23 42 / 0.04), 0 24px 48px -24px rgb(15 23 42 / 0.25)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
