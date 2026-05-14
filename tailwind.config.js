/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#2a2d35',
          100: '#23262e',
          200: '#1e2028',
          300: '#191b22',
          400: '#14161c',
          500: '#0f1117',
        },
        accent: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
        },
        waveform: {
          DEFAULT: '#22d3ee',
          dim: '#0e7490',
        },
        selection: {
          DEFAULT: 'rgba(99, 102, 241, 0.3)',
          border: '#6366f1',
        },
      },
    },
  },
  plugins: [],
}
