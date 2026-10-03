import { db } from '@daydrift/db';
import { createAiPlanQueue } from '@daydrift/queue';
import { CreateTripInputSchema } from '@daydrift/types';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth, errorEnvelope } from '../plugins/auth.js';

/**
 * Versioned route surface for /api/v1. Mirrors docs/04-api.md §4.
 * Handlers are skeleton stubs: they compile and return placeholder shapes.
 */
export const routes: FastifyPluginAsync = async (app) => {
  // ---- Places (public reads; writes require auth) ----

  // GET /places?city=&category= — public catalog listing.
  app.get('/places', async (request) => {
    const { city, category } = request.query as {
      city?: string;
      category?: string;
    };
    // TODO: query places table filtered by city/category.
    void db;
    void city;
    void category;
    return { places: [] as unknown[] };
  });

  // GET /places/:id — single place; NOT_FOUND if absent.
  app.get('/places/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: fetch place by id.
    void id;
    reply.status(404);
    return errorEnvelope('NOT_FOUND', 'Place not found');
  });

  // POST /places/seed { city } — ingest places for a city.
  app.post('/places/seed', { preHandler: requireAuth }, async (request) => {
    const { city } = request.body as { city: string };
    // TODO: enqueue/perform seeding for the city (feeds the RAG index).
    void city;
    return { seeded: 0 };
  });

  // POST /places/search/semantic { query, city, limit } — vector search.
  app.post('/places/search/semantic', { preHandler: requireAuth }, async (request) => {
    const { query, city, limit } = request.body as {
      query: string;
      city: string;
      limit?: number;
    };
    // TODO: embed query + run vector search over the city pool (packages/core).
    void query;
    void city;
    void limit;
    return { results: [] as unknown[] };
  });

  // ---- Trips (all require auth) ----

  // POST /trips — validate input, create pending trip, enqueue ai-plan job.
  app.post('/trips', { preHandler: requireAuth }, async (request, reply) => {
    const parsed = CreateTripInputSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return errorEnvelope('VALIDATION_ERROR', 'Invalid trip input', parsed.error.flatten());
    }

    // TODO: insert trips row with status "pending" and derived inputHash.
    const tripId = 'trip_todo';
    void db;

    // Enqueue the generation job for the worker.
    // userId is persisted on the trips row (above); the job carries tripId + input.
    const queue = createAiPlanQueue();
    await queue.add('ai-plan', {
      tripId,
      input: parsed.data,
    });

    reply.status(201);
    return { tripId };
  });

  // GET /trips?city= — caller's own trips, newest first.
  app.get('/trips', { preHandler: requireAuth }, async (request) => {
    const { city } = request.query as { city?: string };
    // TODO: list trips for request.userId filtered by city.
    void city;
    return { trips: [] as unknown[] };
  });

  // GET /trips/:id — full trip incl. itinerary + route.
  app.get('/trips/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: fetch trip owned by request.userId.
    void id;
    reply.status(404);
    return errorEnvelope('NOT_FOUND', 'Trip not found');
  });

  // GET /trips/:id/status — lightweight polling fallback.
  app.get('/trips/:id/status', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    // TODO: return { status, step? } for the trip.
    void id;
    return { status: 'pending' as const };
  });

  // DELETE /trips/:id — remove the trip.
  app.delete('/trips/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: delete trip owned by request.userId.
    void id;
    reply.status(204);
    return null;
  });

  // POST /trips/:id/regenerate — reset to pending and re-enqueue.
  app.post('/trips/:id/regenerate', { preHandler: requireAuth }, async (request) => {
    const { id } = request.params as { id: string };
    // TODO: load the existing trip's input, reset status to "pending",
    // and re-enqueue with that input. Placeholder input keeps this compiling.
    const queue = createAiPlanQueue();
    await queue.add('ai-plan', {
      tripId: id,
      input: { city: '', interests: [], duration: 'half-day', travelMode: 'walking' },
    });
    return { tripId: id };
  });
};
