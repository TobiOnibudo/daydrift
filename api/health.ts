import { buildApp } from '../apps/api/src/app.js';

const app = buildApp({ webDist: false });

export default async function handler(request: unknown, response: unknown): Promise<void> {
  const server = await app;
  await server.ready();
  server.server.emit('request', request, response);
}
