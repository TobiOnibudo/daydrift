import react from '@vitejs/plugin-react-oxc';
import { defineConfig } from 'vitest/config';

// In dev, proxy API calls to the backend so the browser sees a single origin, exactly like
// production (where the API serves this SPA). Cookies, SSE and CORS then just work.
// Set VITE_API_URL only when the API is deployed on a different origin.
const api = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    allowedHosts: ['daydriftweb.up.railway.app'],

    proxy: {
      '/api': { target: api, changeOrigin: false },
      '/health': { target: api, changeOrigin: false },
    },
  },

  build: {
    sourcemap: true,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (/[/\\]node_modules[/\\](leaflet|react-leaflet)[/\\]/.test(id)) {
            return 'leaflet';
          }
          if (/[/\\]node_modules[/\\]framer-motion[/\\]/.test(id)) {
            return 'motion';
          }
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
