/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        void: '#08080d',
        surface: '#0f0f1a',
        panel: '#13131f',
        border: '#1e1e30',
        crimson: '#dc2626',
        crimsonHot: '#ff3333',
        crimsonDim: '#7f1d1d',
        steel: '#94a3b8',
        bright: '#e2e8f0',
      },
      animation: {
        'pulse-red': 'pulse-red 2s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'flicker': 'flicker 0.15s ease-in-out infinite alternate',
      },
      keyframes: {
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 8px #dc2626' },
          '50%': { boxShadow: '0 0 24px #ff3333, 0 0 48px #dc262640' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
}
