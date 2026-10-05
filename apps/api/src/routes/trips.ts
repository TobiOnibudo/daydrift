import { config } from '@daydrift/config';
import {
  deleteTrip,
  failTrip,
  getCachedTripResult,
  getTrip,
  hashInput,
  insertTrip,
  listTrips,
  normalizeInput,
  resetTrip,
  shareTrip,
  tripInput,
  unshareTrip,
} from '@daydrift/core';
import { CreateTripInputSchema, type TripResult } from '@daydrift/types';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { AppError, parse } from '../lib/errors.js';
import { requireAuth } from '../plugins/auth.js';

const IdParams = z.object({ id: z.string().uuid() });
// Each uncached trip is an LLM run, so creation is limited far more tightly than reads.
const CREATE_LIMIT = {
  max: config.nodeEnv === 'production' ? 20 : 10_000,
  timeWindow: '15 minutes',
};

const ListQuery = z.object({ city: z.string().trim().min(1).optional() });

export const tripRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // Create a trip: serve from the result cache when possible, otherwise enqueue generation.
  app.post('/trips', { config: { rateLimit: CREATE_LIMIT } }, async (request, reply) => {
    const input = normalizeInput(parse(CreateTripInputSchema, request.body));
    const inputHash = hashInput(input);

    let cached: TripResult | null = null;
    try {
      cached = await getCachedTripResult(inputHash);
    } catch (err) {
      request.log.warn({ err }, 'result cache unavailable; generating');
    }

    if (cached) {
      const trip = await insertTrip({ userId: request.userId, input, inputHash, result: cached });
      return reply.status(201).send({ tripId: trip.id, status: trip.status });
    }

    const trip = await insertTrip({ userId: request.userId, input, inputHash });
    try {
      await app.aiPlanQueue.add('ai-plan', { tripId: trip.id, input }, { jobId: trip.id });
    } catch (err) {
      request.log.error({ err, tripId: trip.id }, 'failed to enqueue ai-plan job');
      await failTrip(trip.id);
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Trip generation is temporarily unavailable');
    }
    return reply.status(201).send({ tripId: trip.id, status: trip.status });
  });

  app.get('/trips', async (request) => ({
    trips: await listTrips(request.userId, parse(ListQuery, request.query).city),
  }));

  app.get('/trips/:id', async (request) => {
    const { id } = parse(IdParams, request.params);
    const trip = await getTrip(id, request.userId);
    if (!trip) throw AppError.notFound('Trip');
    return { trip };
  });

  app.get('/trips/:id/status', async (request) => {
    const { id } = parse(IdParams, request.params);
    const trip = await getTrip(id, request.userId);
    if (!trip) throw AppError.notFound('Trip');
    return { status: trip.status };
  });

  app.delete('/trips/:id', async (request, reply) => {
    const { id } = parse(IdParams, request.params);
    if (!(await deleteTrip(id, request.userId))) throw AppError.notFound('Trip');
    return reply.status(204).send();
  });

  // Sharing is opt-in per trip and only for completed trips; the token is the only credential.
  app.post('/trips/:id/share', async (request) => {
    const { id } = parse(IdParams, request.params);
    const shareToken = await shareTrip(id, request.userId);
    if (!shareToken) throw AppError.notFound('Completed trip');
    return { shareToken };
  });

  app.delete('/trips/:id/share', async (request, reply) => {
    const { id } = parse(IdParams, request.params);
    if (!(await unshareTrip(id, request.userId))) throw AppError.notFound('Trip');
    return reply.status(204).send();
  });

  // Regenerate deliberately bypasses the result cache to produce a fresh itinerary.
  app.post('/trips/:id/regenerate', async (request, reply) => {
    const { id } = parse(IdParams, request.params);
    const existing = await getTrip(id, request.userId);
    if (!existing) throw AppError.notFound('Trip');
    if (existing.status === 'pending' || existing.status === 'processing') {
      throw AppError.conflict('Trip is already being generated');
    }

    const trip = await resetTrip(id, request.userId);
    if (!trip) throw AppError.notFound('Trip');
    await app.aiPlanQueue.add(
      'ai-plan',
      { tripId: trip.id, input: tripInput(trip) },
      { jobId: `${trip.id}-${Date.now()}` },
    );
    return reply.status(202).send({ tripId: trip.id, status: trip.status });
  });
};
