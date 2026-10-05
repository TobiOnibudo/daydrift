import { fontFamily } from 'tailwindcss/defaultTheme';

/**
 * Design tokens, defined once. Components consume semantic names (bg-background, text-primary,
 * rounded-lg, font-display), never raw colors, so the whole UI stays cohesive.
 * The signature is the route line: a dashed path linking numbered waypoints (see components/route).
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.25rem', screens: { '2xl': '72rem' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        sea: 'hsl(var(--sea))',
        sand: 'hsl(var(--sand))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        display: ['"Fraunces Variable"', ...fontFamily.serif],
        sans: ['"Inter Variable"', ...fontFamily.sans],
      },
      boxShadow: {
        soft: '0 1px 2px hsl(var(--foreground) / 0.06), 0 8px 24px -12px hsl(var(--foreground) / 0.18)',
      },
      keyframes: {
        caret: { to: { visibility: 'hidden' } },
        topo: {
          from: { transform: 'rotate(0deg) scale(1.05)' },
          to: { transform: 'rotate(360deg) scale(1.05)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(3%, -4%, 0) scale(1.08)' },
        },
      },
      animation: {
        drift: 'drift 18s ease-in-out infinite',
        topo: 'topo 90s linear infinite',
        caret: 'caret 1s steps(2, start) infinite',
      },
    },
  },
  plugins: [],
};
