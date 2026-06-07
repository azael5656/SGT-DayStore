/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#c54d0d',
        primaryDark: '#f55200',
      },
    },
  },
  plugins: [],
};
