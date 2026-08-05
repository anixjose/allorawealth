import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          500: '#3b5fe0',
          600: '#2f4bc4',
          700: '#263ca0',
        },
        // Allora Wealth marketing site palette (extracted from the Figma Make design).
        ink: {
          DEFAULT: '#04080f',
          800: '#0a0f1a',
          700: '#0d1420',
          600: '#141d2e',
        },
        gold: {
          200: '#f0d78a',
          400: '#dcb35c',
          500: '#c9973a',
          600: '#a97c2c',
        },
        slate: {
          muted: '#5a6a85',
          soft: '#8a9ab5',
          light: '#c8d4e8',
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
