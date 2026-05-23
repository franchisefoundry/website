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
      },
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
