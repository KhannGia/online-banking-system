import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm near-black charcoal — a vault at night, not another cool "slate" SaaS bg.
        ink: {
          50: '#faf8f4',
          100: '#f1ede4',
          200: '#ded5c4',
          300: '#bfb096',
          400: '#94876c',
          500: '#6b5f48',
          600: '#4a4030',
          700: '#332c20',
          800: '#241f17',
          850: '#1c1811',
          900: '#161310',
          950: '#0c0a08',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'serif'],
        sans: ['"Work Sans"', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
