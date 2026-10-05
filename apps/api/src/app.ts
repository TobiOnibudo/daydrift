import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { config } from '@daydrift/config';
import { createAiPlanQueue, type AiPlanJobData } from '@daydrift/queue';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
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
  /** Override the API rate limit (tests). */
  rateLimit?: { max: number; timeWindow: string };
  /** Directory with the built SPA. Defaults to apps/web/dist; set false to disable. */
  webDist?: string | false;
}

const DEFAULT_WEB_DIST = fileURLToPath(new URL('../../web/dist', import.meta.url));

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true, trustProxy: true });

  const webDist = options.webDist ?? DEFAULT_WEB_DIST;
  const serveSpa = webDist !== false && existsSync(`${webDist}/index.html`);
  registerErrorHandlers(app, { spaFallback: serveSpa });

  // CORS: prod locks to the web origin; dev is permissive. Credentials for cookie auth.
  await app.register(cors, { origin: isProd ? config.webUrl : true, credentials: true });

  // Rate limiting (docs/04 §7) covers the API only: the SPA's scripts, styles and fonts, and the
  // health probes, must never count against a visitor. Trip creation has its own, tighter limit.
  await app.register(rateLimit, {
    max: options.rateLimit?.max ?? config.rateLimitMax ?? (isProd ? 300 : 10_000),
    timeWindow: options.rateLimit?.timeWindow ?? (isProd ? '15 minutes' : '1 minute'),
    allowList: (req) => !req.url.startsWith('/api/'),
  });

  const queue = options.aiPlanQueue ?? createAiPlanQueue();
  app.decorate('aiPlanQueue', queue);
  app.addHook('onClose', async () => {
    await queue.close();
  });

  if (serveSpa) {
    // Vite emits content-hashed files under /assets, so those cache forever; everything else revalidates.
    await app.register(fastifyStatic, {
      root: webDist,
      wildcard: false,
      setHeaders: (res, path) => {
        res.setHeader(
          'Cache-Control',
          /[\\/]assets[\\/]/.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    });
  }

  await app.register(healthRoutes);
  await app.register(betterAuthRoutes);
  await app.register(v1Routes, { prefix: '/api/v1' });

  return app;
}
