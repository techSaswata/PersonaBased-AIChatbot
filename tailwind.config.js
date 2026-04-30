/** @type {import("tailwindcss").Config} */
const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        paper: "#f8fafc"
      }
    }
  },
  plugins: []
};

module.exports = config;
