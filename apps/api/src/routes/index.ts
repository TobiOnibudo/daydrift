import type { FastifyPluginAsync } from 'fastify';

import { placeRoutes } from './places.js';
import { sseRoutes } from './sse.js';
import { tripRoutes } from './trips.js';

/** The versioned REST surface, mounted under /api/v1 (docs/04 §4). */
export const v1Routes: FastifyPluginAsync = async (app) => {
  await app.register(placeRoutes);
  await app.register(tripRoutes);
  await app.register(sseRoutes);
};

export { healthRoutes } from './health.js';
