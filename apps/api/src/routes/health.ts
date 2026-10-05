import { checkDependencies } from '@daydrift/core';
import type { FastifyPluginAsync } from 'fastify';

import { AppError } from '../lib/errors.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Liveness: 200 while the process is up.
  app.get('/health', async () => ({ status: 'ok' }));

  // Readiness: 200 only when Postgres and Redis both respond (used by Railway health checks).
  app.get('/health/ready', async () => {
    const health = await checkDependencies();
    if (!health.database || !health.redis) {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Dependencies are not ready', health);
    }
    return { status: 'ready' };
  });
};
