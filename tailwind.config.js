/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontSize: {
        'xs': ['13px', { lineHeight: '1.5', letterSpacing: '0.3px' }],
        'sm': ['14px', { lineHeight: '1.5', letterSpacing: '0.3px' }],
        'base': ['15px', { lineHeight: '1.6', letterSpacing: '0.3px' }],
        'lg': ['16px', { lineHeight: '1.6', letterSpacing: '0.3px' }],
        'xl': ['18px', { lineHeight: '1.7', letterSpacing: '0.4px' }],
        '2xl': ['20px', { lineHeight: '1.7', letterSpacing: '0.4px' }],
      },
      spacing: {
        'safe': '0.5rem',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["business", "dim", "dark"],
  },
};
