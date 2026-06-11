/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors:{
        teal:  { DEFAULT: "#99f6e4" },
        cyan:  { glow: '#00ffc2' },
        light: { bg: '#f7f7fc', card: '#ffffff' },
        dark:  {bg: '#000916', card: '#020d1b'},
        text: {
          primary:         '#1d2d3e',
          secondary:       '#1e293b',
          teritary :       '#44474c',
          disabled:        '#a5a9b1',
          'dark-system':   '#ffffff',
          'dark-primary':  '#e9ebee',
          'dark-teritary': '#44474c', 
        },
        success:  '#00d66b',
        warning : '#ff9500',
        error:    '#ff3b30'
      },
      fontFamily: {
        sans: ['Poppins', 'san-serif'],
      },
      fontSize: {
        'heading-1': ['24px', { lineHeight: '24px', fontWeight: '500' }],
        'heading-2': ['18px', { lineHeight: '24px', fontWeight: '400' }],
        'body':      ['14px', { lineHeight: '24px', fontWeight: '400' }],
        'button':    ['18px', { lineHeight: '24px', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
}

