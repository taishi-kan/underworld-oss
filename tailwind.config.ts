import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        underworld: {
          bg: '#02040a',
          deep: '#04081a',
          panel: 'rgba(8, 18, 38, 0.55)',
          border: 'rgba(120, 200, 255, 0.25)',
          glow: '#7fdcff',
          accent: '#9bdcff',
          mist: 'rgba(150, 210, 255, 0.7)',
          rune: '#cfe9ff',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', '"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Cinzel"', 'serif'],
      },
      boxShadow: {
        glow: '0 0 32px rgba(127, 220, 255, 0.35)',
        'glow-strong': '0 0 64px rgba(127, 220, 255, 0.5)',
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        floaty: 'floaty 4s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.4s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
