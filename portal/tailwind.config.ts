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
