import { config } from '@daydrift/config';
import { createAiPlanQueue, type AiPlanJobData } from '@daydrift/queue';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import type { Queue } from 'bullmq';
import Fastify from 'fastify';

import { betterAuthRoutes } from './plugins/better-auth.js';
import { registerErrorHandlers } from './plugins/error-handler.js';
import { healthRoutes, v1Routes } from './routes/index.js';

export type AiPlanQueue = Pick<Queue<AiPlanJobData>, 'add' | 'close'>;

declare module 'fastify' {
  interface FastifyInstance {
    aiPlanQueue: AiPlanQueue;
  }
}

const isProd = config.nodeEnv === 'production';

export interface AppOptions {
  /** Override the ai-plan producer (tests). Defaults to the real BullMQ queue. */
  aiPlanQueue?: AiPlanQueue;
  logger?: boolean;
}

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true, trustProxy: true });

  registerErrorHandlers(app);

  // CORS: prod locks to the web origin; dev is permissive. Credentials for cookie auth.
  await app.register(cors, { origin: isProd ? config.webUrl : true, credentials: true });

  // Rate limiting (docs/04 §7); health probes are allow-listed so platform checks never throttle.
  await app.register(rateLimit, {
    max: isProd ? 100 : 10_000,
    timeWindow: isProd ? '15 minutes' : '1 minute',
    allowList: (req) => req.url === '/health' || req.url === '/health/ready',
  });

  const queue = options.aiPlanQueue ?? createAiPlanQueue();
  app.decorate('aiPlanQueue', queue);
  app.addHook('onClose', async () => {
    await queue.close();
  });

  await app.register(healthRoutes);
  await app.register(betterAuthRoutes);
  await app.register(v1Routes, { prefix: '/api/v1' });

  return app;
}
