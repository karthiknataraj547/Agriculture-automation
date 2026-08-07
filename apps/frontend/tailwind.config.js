/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          900: '#e6ecf5',
          800: '#f0f5fc',
          700: '#f8fafc',
          600: '#dce4f0'
        },
        cyber: {
          cyan: '#0284c7',
          emerald: '#059669',
          amber: '#d97706',
          crimson: '#dc2626',
          violet: '#7c3aed'
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -2px rgba(2, 132, 199, 0.3)',
        'glow-emerald': '0 0 20px -2px rgba(5, 150, 105, 0.3)',
        'glow-crimson': '0 0 20px -2px rgba(220, 38, 38, 0.3)',
        'spatial': '8px 8px 24px #b6c3d7, -8px -8px 24px #ffffff'
      },
      animation: {
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.7', filter: 'drop-shadow(0 0 6px rgba(2,132,199,0.4))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 14px rgba(2,132,199,0.8))' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' }
        }
      }
    },
  },
  plugins: [],
}
