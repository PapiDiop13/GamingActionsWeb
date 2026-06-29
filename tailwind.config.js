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
        black:  '#0A0A0F',
        dark:   '#12121A',
        card:   '#1A1A26',
        card2:  '#202030',
        gold:   '#C9A84C',
        gold2:  '#E8C96B',
        gray:   '#888899',
        gray2:  '#444455',
        gray3:  '#2A2A3A',
        accent: '#FF2D55',
        blue:   '#00D4FF',
        green:  '#00C853',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
};
