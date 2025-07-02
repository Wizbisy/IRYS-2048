/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        irys: {
          primary: "#00FF7F",
          gradientFrom: "#06B6D4",
          gradientTo: "#4ADE80",
        },
      },
    },
  },
  plugins: [],
};