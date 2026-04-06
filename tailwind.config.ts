import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        display: '-0.04em',
        tight: '-0.02em',
        label: '0.08em',
        widest: '0.2em',
      },
      keyframes: {
        // GPU-composited only: opacity + filter + transform
        // Zero CLS impact — compositor thread handles this independently
        'blur-in': {
          from: { opacity: '0', filter: 'blur(10px)', transform: 'translateY(6px)' },
          to:   { opacity: '1', filter: 'blur(0px)',  transform: 'translateY(0px)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0px)'  },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to:   { opacity: '1', transform: 'scale(1)'    },
        },
        'line-grow': {
          from: { transform: 'scaleX(0)', transformOrigin: 'left' },
          to:   { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
        // Slow vertical float — for decorative blobs in Hero
        // GPU-composited (transform only) → zero layout impact, zero CLS
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-18px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-12px)' },
        },
      },
      animation: {
        // Spring easing: fast start, smooth deceleration (designers typically use for apple's ios preferred curve)
        'blur-in':    'blur-in 0.85s cubic-bezier(0.16, 1, 0.3, 1) both',
        'blur-in-d1': 'blur-in 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
        'blur-in-d2': 'blur-in 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both',
        'blur-in-d3': 'blur-in 0.85s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both',
        'fade-up':    'fade-up  0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both',
        'fade-up-d1': 'fade-up  0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both',
        'fade-up-d2': 'fade-up  0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.45s both',
        'fade-in':    'fade-in  0.4s  ease-out both',
        'scale-in':   'scale-in 0.4s  cubic-bezier(0.16, 1, 0.3, 1) both',
        'line-grow':  'line-grow 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both',
        // Infinite float — slow, gentle, looping. Only runs on decorative elements.
        'float':      'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
