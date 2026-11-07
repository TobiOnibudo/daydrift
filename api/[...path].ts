import { buildApp } from '../apps/api/src/app.js';

// Vercel keeps a warm function instance when possible, so initialize Fastify once
// per instance and send each Node request through its native server handler.
const app = buildApp({ webDist: false });

export default async function handler(request: unknown, response: unknown): Promise<void> {
  const server = await app;
  await server.ready();
  server.server.emit('request', request, response);
}
