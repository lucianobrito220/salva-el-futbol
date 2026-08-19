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
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        xl2: '18px',
      },
      boxShadow: {
        'card': '0 2px 12px -2px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 8px 28px -4px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.06)',
        'glow-brand': '0 4px 20px -4px rgba(30, 158, 74, 0.35)',
        'glow-brand-lg': '0 8px 32px -4px rgba(30, 158, 74, 0.45)',
        'inner-brand': 'inset 0 1px 2px rgba(30, 158, 74, 0.1)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
};

export default config;
