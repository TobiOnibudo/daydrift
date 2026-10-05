import type { OutgoingHttpHeaders } from 'node:http';

import { config } from '@daydrift/config';
import { getTrip } from '@daydrift/core';
import type { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';
import { z } from 'zod';

import { AppError, parse } from '../lib/errors.js';
import { requireAuth } from '../plugins/auth.js';

const IdParams = z.object({ id: z.string().uuid() });
const EVENTS = new Set(['status', 'token', 'complete', 'failed']);
const TERMINAL = new Set(['complete', 'failed']);
const HEARTBEAT_MS = 20_000;
const FAILURE_MESSAGE = 'We could not generate your itinerary. Please try again.';

/**
 * GET /trips/:id/stream — relays the worker's Redis pub/sub events for a trip as SSE (docs/04 §5).
 * Subscribes first and then checks the stored status, so a client that connects after the worker
 * finished still receives the terminal event instead of hanging.
 */
export const sseRoutes: FastifyPluginAsync = async (app) => {
  app.get('/trips/:id/stream', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = parse(IdParams, request.params);
    if (!(await getTrip(id, request.userId))) throw AppError.notFound('Trip');

    reply.hijack();
    reply.raw.writeHead(200, {
      ...(reply.getHeaders() as OutgoingHttpHeaders),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const channel = `trip:${id}`;
    const subscriber = new Redis(config.redis.url);
    let eventId = 0;
    let closed = false;

    const send = (event: string, data: unknown) => {
      if (closed) return;
      eventId += 1;
      reply.raw.write(`id: ${eventId}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const heartbeat = setInterval(() => {
      if (!closed) reply.raw.write(': ping\n\n');
    }, HEARTBEAT_MS);

    const close = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      subscriber.disconnect();
      reply.raw.end();
    };

    request.raw.on('close', close);
    subscriber.on('error', (err) => request.log.error({ err }, 'sse subscriber error'));

    subscriber.on('message', (_channel, payload) => {
      try {
        const message = JSON.parse(payload) as { event: string; data: unknown };
        if (!EVENTS.has(message.event)) return;
        send(message.event, message.data);
        if (TERMINAL.has(message.event)) close();
      } catch {
        request.log.warn('ignoring malformed trip event');
      }
    });

    try {
      await subscriber.subscribe(channel);

      // The worker may have finished before we subscribed; replay the terminal state from the DB.
      const trip = await getTrip(id, request.userId);
      if (trip?.status === 'complete') {
        send('complete', { trip });
        close();
      } else if (trip?.status === 'failed') {
        send('failed', { message: FAILURE_MESSAGE });
        close();
      }
    } catch (err) {
      request.log.error({ err }, 'sse setup failed');
      send('failed', { message: FAILURE_MESSAGE });
      close();
    }
  });
};
