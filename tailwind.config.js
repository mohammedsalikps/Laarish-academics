/** @type {import('tailwindcss').Config} */

// Design tokens live as CSS variables in src/styles/tokens.css so they can be
// themed at runtime. Tailwind maps them to utilities here.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        canvas: { DEFAULT: token('canvas'), sunken: token('canvas-sunken') },
        surface: token('surface'),
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        ink: { DEFAULT: token('ink'), soft: token('ink-soft'), muted: token('ink-muted') },
        primary: {
          DEFAULT: token('primary'),
          strong: token('primary-strong'),
          soft: token('primary-soft'),
          tint: token('primary-tint'),
        },
        success: { DEFAULT: token('success'), strong: token('success-strong'), soft: token('success-soft') },
        reward: { DEFAULT: token('reward'), strong: token('reward-strong'), soft: token('reward-soft') },
        coral: { DEFAULT: token('coral'), strong: token('coral-strong'), soft: token('coral-soft') },
        sky: { DEFAULT: token('sky'), soft: token('sky-soft') },
      },
      fontFamily: {
        sans: [
          '"Nunito Variable"',
          'Nunito',
          'ui-rounded',
          '"Segoe UI"',
          'system-ui',
          '"Noto Sans Devanagari"',
          '"Noto Sans Kannada"',
          '"Nirmala UI"',
          'sans-serif',
        ],
        display: ['"Fredoka Variable"', 'Fredoka', '"Nunito Variable"', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(29 26 74 / 0.05), 0 4px 14px rgb(29 26 74 / 0.06)',
        lift: '0 2px 4px rgb(29 26 74 / 0.06), 0 14px 32px rgb(29 26 74 / 0.10)',
        float: '0 24px 60px rgb(29 26 74 / 0.18)',
        'press-primary': '0 4px 0 rgb(var(--c-primary-strong))',
        'press-success': '0 4px 0 rgb(var(--c-success-strong))',
        'press-line': '0 3px 0 rgb(var(--c-line-strong))',
        'press-reward': '0 4px 0 rgb(var(--c-reward-strong))',
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.85) translateY(6px)' },
          '60%': { opacity: '1', transform: 'scale(1.04) translateY(0)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--c-primary) / 0.45)' },
          '70%': { boxShadow: '0 0 0 14px rgb(var(--c-primary) / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--c-primary) / 0)' },
        },
        'star-pop': {
          '0%': { opacity: '0', transform: 'scale(0) rotate(-30deg)' },
          '70%': { opacity: '1', transform: 'scale(1.25) rotate(8deg)' },
          '100%': { transform: 'scale(1) rotate(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'reward-rise': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.9)' },
          '15%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '85%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-10px)' },
        },
        blink: {
          '0%, 92%, 100%': { transform: 'scaleY(1)' },
          '95%': { transform: 'scaleY(0.1)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-3px) rotate(-2deg)' },
        },
        'dot-bounce': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
          '40%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        // One small hop, for a mentor cheering a right answer.
        cheer: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '35%': { transform: 'translateY(-10px) scale(1.03)' },
          '65%': { transform: 'translateY(0) scale(0.99)' },
        },
        // One thoughtful head tilt, for "let's think again".
        tilt: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '30%': { transform: 'rotate(-4deg)' },
          '70%': { transform: 'rotate(3deg)' },
        },
        confetti: {
          '0%': { transform: 'translate3d(0,0,0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translate3d(var(--dx), 110vh, 0) rotate(var(--rot))', opacity: '0.9' },
        },
      },
      animation: {
        'pop-in': 'pop-in 420ms cubic-bezier(.2,.9,.3,1.2) both',
        'fade-up': 'fade-up 380ms ease-out both',
        'fade-in': 'fade-in 240ms ease-out both',
        'slide-in-right': 'slide-in-right 320ms cubic-bezier(.2,.8,.2,1) both',
        'slide-in-up': 'slide-in-up 320ms cubic-bezier(.2,.8,.2,1) both',
        shake: 'shake 420ms ease-in-out',
        float: 'float 5s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
        'star-pop': 'star-pop 520ms cubic-bezier(.2,.9,.3,1.3) both',
        shimmer: 'shimmer 1.4s linear infinite',
        'reward-rise': 'reward-rise 2600ms ease-out both',
        blink: 'blink 4.5s ease-in-out infinite',
        bob: 'bob 2.4s ease-in-out infinite',
        'dot-bounce': 'dot-bounce 1.2s ease-in-out infinite',
        cheer: 'cheer 600ms ease-out 1',
        tilt: 'tilt 700ms ease-in-out 1',
      },
    },
  },
  plugins: [],
};
