import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Proxy API calls whenever Vite serves the frontend separately. Keeping the browser on one origin
// is required for reliable cookie sessions in mobile browsers, which commonly reject third-party
// cookies. VITE_API_URL remains a fallback for existing deployments but is never embedded into the
// browser bundle.
const api = process.env.API_PROXY_TARGET ?? process.env.VITE_API_URL ?? 'http://localhost:3000';
const proxy = {
  '/api': { target: api, changeOrigin: true },
  '/health': { target: api, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    allowedHosts: ['daydriftweb.up.railway.app'],

    proxy,
  },

  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    proxy,
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
});
