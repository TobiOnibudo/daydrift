import { buildApp } from '../apps/api/dist/app.js';

const app = buildApp({ webDist: false });

export default async function handler(request, response) {
  const server = await app;
  await server.ready();
  server.server.emit('request', request, response);
}
