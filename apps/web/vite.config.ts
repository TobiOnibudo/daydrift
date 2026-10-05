import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// In dev, proxy API calls to the backend so the browser sees a single origin, exactly like
// production (where the API serves this SPA). Cookies, SSE and CORS then just work.
// Set VITE_API_URL only when the API is deployed on a different origin.
const api = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: api, changeOrigin: false },
      '/health': { target: api, changeOrigin: false },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet', 'react-leaflet'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
    css: false,
  },
});
