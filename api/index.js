import { buildApp } from '../apps/api/dist/app.js';

const app = buildApp({ webDist: false });

/** Explicit Vercel rewrite target for the versioned Fastify API. */
export default async function handler(request, response) {
  const server = await app;
  await server.ready();

  const url = new URL(request.url, 'https://daydrift.local');
  const originalPath = url.searchParams.get('__daydrift_path');
  if (originalPath) {
    url.searchParams.delete('__daydrift_path');
    const query = url.searchParams.toString();
    request.url = `/api/${originalPath}${query ? `?${query}` : ''}`;
  }

  server.server.emit('request', request, response);
}
