import { buildApp } from '../apps/api/dist/app.js';

const app = buildApp({ webDist: false });

export default async function handler(request, response) {
  const server = await app;
  await server.ready();
  // This function is reached through /api/health after the public /health rewrite.
  // Fastify owns the public health route without the internal /api prefix.
  request.url = request.url.replace(/^\/api/, '');
  server.server.emit('request', request, response);
}
