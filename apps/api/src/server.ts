import { auth, fromNodeHeaders } from '@daydrift/auth';
import { config } from '@daydrift/config';
import { db } from '@daydrift/db';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { errorEnvelope } from './plugins/auth.js';
import { routes } from './routes/index.js';
import { sseRoutes } from './routes/sse.js';

const isProd = config.nodeEnv === 'production';

export async function buildServer() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  // CORS: prod locks to the web origin; dev is permissive. Credentials for cookie auth.
  await app.register(cors, {
    origin: isProd ? config.webUrl : true,
    credentials: true,
  });

  // Rate limiting: strict in prod, effectively unthrottled in dev.
  // Health probes are allow-listed so platform checks are never throttled (docs/04 §7).
  await app.register(rateLimit, {
    max: isProd ? 100 : 10_000,
    timeWindow: isProd ? '15 minutes' : '1 minute',
    allowList: (req) => req.url === '/health' || req.url === '/health/ready',
  });

  // Mount Better Auth at /api/v1/auth/* (sign-up, sign-in, sign-out, session). See docs/04 §3.
  app.route({
    method: ['GET', 'POST'],
    url: '/api/v1/auth/*',
    handler: async (request, reply) => {
      const response = await auth.handler(
        new Request(`${request.protocol}://${request.hostname}${request.url}`, {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
          body:
            request.method === 'GET' || request.method === 'HEAD'
              ? undefined
              : JSON.stringify(request.body),
        }),
      );
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    },
  });

  // Versioned REST routes under /api/v1.
  await app.register(routes, { prefix: '/api/v1' });

  // SSE stream route (also under /api/v1).
  await app.register(sseRoutes, { prefix: '/api/v1' });

  // Liveness: always 200 while the process is up.
  app.get('/health', async () => ({ status: 'ok' }));

  // Readiness: 200 when DB + Redis respond, else 503. Stubbed as ok for now.
  app.get('/health/ready', async (_request, reply) => {
    try {
      // TODO: ping DB (e.g. `select 1`) and Redis before reporting ready.
      void db;
      return { status: 'ready' };
    } catch {
      reply.status(503);
      return errorEnvelope('SERVICE_UNAVAILABLE', 'Dependencies are not ready');
    }
  });

  // Central error handler emitting the { error: { code, message, details? } } envelope.
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error.validation) {
      reply.status(400);
      return errorEnvelope('VALIDATION_ERROR', error.message, {
        fields: error.validation,
      });
    }

    const status = error.statusCode ?? 500;
    if (status === 429) {
      reply.status(429);
      return errorEnvelope('RATE_LIMITED', 'Too many requests');
    }
    if (status >= 500) {
      reply.status(500);
      // INTERNAL: generic message to client; stack is logged above.
      return errorEnvelope('INTERNAL', 'Internal server error');
    }

    reply.status(status);
    return errorEnvelope('INTERNAL', error.message);
  });

  return app;
}

async function main() {
  const app = await buildServer();
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

main().catch((err) => {
   
  console.error(err);
  process.exit(1);
});
