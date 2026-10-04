import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#3a4a3a',
          'green-dark': '#2a352a',
          'green-light': '#5f725f',
          gold: '#d4a574',
          'gold-light': '#e8c9a0',
        },
        // Warm, green-biased neutral ramp mapped over Tailwind's cool `slate`.
        // The app already uses slate consistently, so this quietly warms every
        // screen at once — reads as chosen, not a default cool grey.
        slate: {
          50:  '#f6f7f2',
          100: '#eef0e9',
          200: '#e3e6df',
          300: '#cdd2c8',
          400: '#9aa196',
          500: '#6c746a',
          600: '#59615a',
          700: '#414a41',
          800: '#2b322b',
          900: '#1b211a',
          950: '#121711',
        },
        // Phase 0 design tokens (map to CSS variables in globals.css)
        ground:    'var(--ff-ground)',
        surface:   'var(--ff-surface)',
        'surface-2': 'var(--ff-surface-2)',
        ink:       'var(--ff-ink)',
        'ink-2':   'var(--ff-ink-2)',
        'ink-3':   'var(--ff-ink-3)',
        line:      'var(--ff-border)',
        'line-2':  'var(--ff-border-2)',
        'ff-green': 'var(--ff-green)',
        'ff-gold':  'var(--ff-gold)',
        'ff-gold-ink': 'var(--ff-gold-ink)',
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
