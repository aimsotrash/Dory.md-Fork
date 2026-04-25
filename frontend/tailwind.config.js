/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Glass / space design system (Shraddha)
        cosmos: {
          950: '#0a0e1a',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
        nebula: {
          600: '#6d28d9',
          500: '#7c3aed',
          400: '#a78bfa',
          300: '#c4b5fd',
          200: '#ddd6fe',
        },
        pulsar: {
          600: '#0e7490',
          500: '#0891b2',
          400: '#22d3ee',
          300: '#67e8f9',
        },
        flare: {
          600: '#ea580c',
          500: '#f97316',
          400: '#fb923c',
          300: '#fdba74',
        },
        // Metro design system
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
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-amber': '0 0 24px rgba(245,166,35,0.2)',
        'glow-teal':  '0 0 24px rgba(0,212,170,0.18)',
        'glow-red':   '0 0 24px rgba(245,59,48,0.2)',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in':    'fadeIn 0.3s ease-out',
        'fade-up':    'fadeIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow':   'glow 2s ease-in-out infinite alternate',
        'float':  'float 6s ease-in-out infinite',
        blink:    'blink 1s step-start infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(124, 58, 237, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.7), 0 0 40px rgba(124, 58, 237, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        blink: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0' },
        },
      },
      backgroundImage: {
        'nebula-gradient': 'linear-gradient(135deg, #7c3aed 0%, #0891b2 100%)',
        'cosmos-gradient': 'radial-gradient(ellipse at top, #1e293b 0%, #0a0e1a 100%)',
        'card-gradient':   'linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
