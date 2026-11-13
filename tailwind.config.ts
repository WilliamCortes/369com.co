import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090a10',
        foreground: '#f3f4f6',
        gold: '#eab308',
        cosmic: '#09090b',
        card: {
          DEFAULT: '#11131f',
          foreground: '#f9fafb',
          border: '#1f2438',
        },
        sacred: {
          gold: '#f59e0b',
          amber: '#d97706',
          violet: '#8b5cf6',
          purple: '#6d28d9',
          cyan: '#06b6d4',
          indigo: '#4f46e5',
        },
      },
      boxShadow: {
        'glow-gold': '0 0 25px -5px rgba(245, 158, 11, 0.3)',
        'glow-violet': '0 0 25px -5px rgba(139, 92, 246, 0.3)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
