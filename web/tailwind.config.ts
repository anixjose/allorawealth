import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Lumina Wealth" design system (Stitch export, applied app-wide) — remapping
        // Tailwind's own gray/brand scales means every existing page inherits the new
        // palette automatically, without needing per-page class changes.
        gray: {
          50: '#f9f9ff',
          100: '#f0f3ff',
          200: '#e2e8f8',
          300: '#c8d0e3',
          400: '#97a2ba',
          500: '#6b7690',
          600: '#4c5670',
          700: '#363f56',
          800: '#232a3d',
          900: '#151c27',
        },
        brand: {
          50: '#eef2ff',
          100: '#dde1ff',
          200: '#c7d2fe',
          300: '#b8c4ff',
          500: '#3755c3',
          600: '#1e40af',
          700: '#173bab',
        },
        'emerald-deep': '#064e3b',
        'royal-blue': '#1e40af',
        'warm-gold': '#b45309',
        'success-bg': '#f0fdf4',
        'surface-gray': '#f9fafb',
        surface: {
          DEFAULT: '#f9f9ff',
          dim: '#d3daea',
          bright: '#f9f9ff',
          container: {
            lowest: '#ffffff',
            low: '#f0f3ff',
            DEFAULT: '#e7eefe',
            high: '#e2e8f8',
            highest: '#dce2f3',
          },
        },
        // Allora Wealth marketing site palette (extracted from the Figma Make design) — unchanged, landing page only.
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
      boxShadow: {
        ambient: '0 10px 25px -5px rgba(6, 78, 59, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
