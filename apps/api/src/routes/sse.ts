import { config } from '@daydrift/config';
import type { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';

import { requireAuth } from '../plugins/auth.js';

/**
 * SSE streaming route. Implements the contract in docs/04 §5.
 *
 * GET /api/v1/trips/:id/stream — subscribes to the Redis channel `trip:<id>`
 * (where the worker publishes progress) and relays each message as an SSE event:
 *   status  -> { step, label }
 *   token   -> { text }
 *   complete-> { trip }   (terminal — stream closes)
 *   failed  -> { message } (terminal — stream closes)
 */
export const sseRoutes: FastifyPluginAsync = async (app) => {
  app.get('/trips/:id/stream', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const channel = `trip:${id}`;

    // SSE headers.
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Dedicated subscriber connection (a Redis client in subscribe mode
    // cannot issue other commands).
    const subscriber = new Redis(config.redis.url);
    let eventId = 0;

    const send = (event: string, data: unknown) => {
      eventId += 1;
      reply.raw.write(`id: ${eventId}\n`);
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    await subscriber.subscribe(channel);

    subscriber.on('message', (_channel: string, payload: string) => {
      // Worker publishes JSON { event, data }.
      let message: { event: string; data: unknown };
      try {
        message = JSON.parse(payload) as { event: string; data: unknown };
      } catch {
        return;
      }

      send(message.event, message.data);

      // Terminal events close the stream (docs/04 §5).
      if (message.event === 'complete' || message.event === 'failed') {
        void cleanup();
      }
    });

    const cleanup = async () => {
      await subscriber.unsubscribe(channel).catch(() => undefined);
      subscriber.disconnect();
      reply.raw.end();
    };

    // Tear down when the client disconnects.
    request.raw.on('close', () => {
      void cleanup();
    });

    // Keep the handler open; the raw socket is managed manually above.
    return reply;
  });
};
