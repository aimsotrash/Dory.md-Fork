/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#030303',
          900: '#080808',
          800: '#0F0F0F',
          750: '#141414',
          700: '#1A1A1A',
          600: '#252525',
          500: '#363636',
          400: '#525252',
          300: '#737373',
          200: '#A3A3A3',
          100: '#D4D4D4',
          50:  '#EDEDED',
        },
        metro: {
          amber:  '#F5A623',
          teal:   '#00D4AA',
          red:    '#F53B30',
          blue:   '#0078D4',
          purple: '#7C3AED',
          green:  '#16A34A',
          pink:   '#EC4899',
          gold:   '#EAB308',
        },
        terminal: {
          amber:  '#FFB347',
          green:  '#39FF14',
          dim:    '#111100',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-amber': '0 0 24px rgba(245,166,35,0.2)',
        'glow-teal':  '0 0 24px rgba(0,212,170,0.18)',
        'glow-red':   '0 0 24px rgba(245,59,48,0.2)',
        'tile':       'inset 0 0 0 1px rgba(255,255,255,0.04)',
        'metro':      '4px 0 0 0 var(--metro-accent)',
      },
      animation: {
        blink:      'blink 1s step-start infinite',
        scanline:   'scanline 8s linear infinite',
        'fade-up':  'fadeUp 0.25s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        pulse:      'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        blink: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0' },
        },
        scanline: {
          '0%':   { top: '-5%' },
          '100%': { top: '105%' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        pulse: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
