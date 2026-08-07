import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1E9E4A',
          dark: '#157135',
          pale: '#E8F5EC',
        },
        charcoal: {
          DEFAULT: '#2B2E33',
          soft: '#363A41',
          line: '#454952',
        },
        ink: '#0F172A',
        inksoft: '#6B7280',
        line: '#E7E9EC',
        bg: '#F4F5F7',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        xl2: '18px',
      },
    },
  },
  plugins: [],
};

export default config;
