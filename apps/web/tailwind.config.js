/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Design tokens (color, spacing, radius, type scale) live here.
      // Define them ONCE so every component consumes tokens for a cohesive,
      // non-templated look. See docs/05-frontend.md §6 (UI Toolkit & Design System).
    },
  },
  plugins: [],
};
