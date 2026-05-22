/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00FFDD',
          dim: '#00CCB0',
          light: '#00BFA0',
        },
        dark: {
          bg: '#00110F',
          surface: '#051917',
          elevated: '#0A2420',
          overlay: '#0F2E28',
        },
        light: {
          bg: '#F8FFFE',
          surface: '#FFFFFF',
          accent: '#E7FFFC',
        },
        danger: '#FF5A6B',
        warning: '#FFC247',
        info: '#4DA3FF',
        success: '#00FFDD',
      },
      fontFamily: {
        display: ['Clash Display', 'sans-serif'],
        sans: ['General Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
      animation: {
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.4,0,0.2,1)',
        'slide-in-up': 'slideInUp 0.3s cubic-bezier(0.4,0,0.2,1)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'bell-dangle': 'bellDangle 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        'pulse-brand': 'pulseBrand 2.5s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        bellDangle: {
          '0%,100%': { transform: 'rotate(0deg)' },
          '20%': { transform: 'rotate(15deg)' },
          '60%': { transform: 'rotate(-10deg)' },
          '80%': { transform: 'rotate(6deg)' },
        },
        pulseBrand: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(0,255,221,0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(0,255,221,0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        brand: '0 0 24px rgba(0,255,221,0.25)',
        'brand-lg': '0 0 48px rgba(0,255,221,0.35)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.6)',
        'glass': '0 4px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
}
