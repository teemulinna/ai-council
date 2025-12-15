/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base
        'bg-primary': '#0D0D0D',
        'bg-secondary': '#1A1A1A',
        'bg-tertiary': '#242424',

        // Accent
        'accent-primary': '#6366F1',
        'accent-secondary': '#8B5CF6',
        'accent-success': '#10B981',
        'accent-warning': '#F59E0B',
        'accent-error': '#EF4444',

        // Provider colors
        'anthropic': '#D4A574',
        'openai': '#10A37F',
        'google': '#4285F4',
        'deepseek': '#5B6EE1',
        'meta': '#0668E1',

        // Text
        'text-primary': '#FAFAFA',
        'text-secondary': '#A1A1A1',
        'text-muted': '#6B6B6B',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(99, 102, 241, 0.3)' },
        },
      },
    },
  },
  plugins: [],
}
