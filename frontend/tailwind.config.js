/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base - Modern Professional (Deep Navy)
        'bg-primary': '#0A1929',
        'bg-secondary': '#0F2744',
        'bg-tertiary': '#1A3A5C',
        'bg-elevated': '#234B73',

        // Accent - Silver & Sky Blue
        'accent-primary': '#64B5F6',
        'accent-secondary': '#90CAF9',
        'accent-silver': '#B0BEC5',
        'accent-gold': '#FFD54F',
        'accent-success': '#4DB6AC',
        'accent-warning': '#FFB74D',
        'accent-error': '#EF5350',

        // Provider colors
        'anthropic': '#D4A574',
        'openai': '#10A37F',
        'google': '#4285F4',
        'deepseek': '#7986CB',
        'meta': '#42A5F5',

        // Text - WCAG AA compliant
        'text-primary': '#ECEFF1',
        'text-secondary': '#B0BEC5',
        'text-muted': '#78909C',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'spin-slow': 'spin 1.5s linear infinite',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(100, 181, 246, 0)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(100, 181, 246, 0.3)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
}
