import type { FastifyInstance } from 'fastify';

import { AppError, errorEnvelope } from '../lib/errors.js';

/** Central handlers emitting the error envelope; unknown errors are logged, never leaked (docs/04 §2). */
export function registerErrorHandlers(
  app: FastifyInstance,
  options: { spaFallback?: boolean } = {},
): void {
  // Browser navigations to client-side routes get the SPA; API and asset misses stay JSON 404s.
  app.setNotFoundHandler((request, reply) => {
    const isApi = request.url.startsWith('/api/') || request.url.startsWith('/health');
    if (options.spaFallback && request.method === 'GET' && !isApi && !request.url.includes('.')) {
      return reply.header('Cache-Control', 'no-cache').sendFile('index.html');
    }
    return reply.status(404).send(errorEnvelope('NOT_FOUND', 'Route not found'));
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send(errorEnvelope(error.code, error.message, error.details));
    }

    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status === 429) {
      return reply.status(429).send(errorEnvelope('RATE_LIMITED', 'Too many requests'));
    }
    if (status >= 400 && status < 500) {
      return reply.status(status).send(errorEnvelope('VALIDATION_ERROR', error.message));
    }

    request.log.error(error);
    return reply.status(500).send(errorEnvelope('INTERNAL', 'Internal server error'));
  });
}
