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
          green: '#5f725f',
          'green-dark': '#4a5a4a',
          'green-light': '#7a8f7a',
          gold: '#d4a574',
          'gold-light': '#e8c9a0',
        },
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
