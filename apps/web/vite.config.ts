import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vite config for the Daydrift SPA (see docs/05-frontend.md §1).
// `VITE_API_URL` is the backend origin; consumed in src/lib/api.ts via
// `import.meta.env.VITE_API_URL`. Define a dev fallback here so the app
// still boots when the env var is unset.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL ?? 'http://localhost:3000',
    ),
  },
});
