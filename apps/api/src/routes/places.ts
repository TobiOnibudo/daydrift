import {
  CITIES,
  findCity,
  getPlace,
  listPlaces,
  seedCity,
  semanticSearchPlaces,
} from '@daydrift/core';
import { PlaceCategorySchema } from '@daydrift/types';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { AppError, parse } from '../lib/errors.js';
import { requireAuth } from '../plugins/auth.js';

const ListQuery = z.object({
  city: z.string().trim().min(1).optional(),
  category: PlaceCategorySchema.optional(),
});
const IdParams = z.object({ id: z.string().uuid() });
const SeedBody = z.object({ city: z.string().trim().min(1) });
const SearchBody = z.object({
  query: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1),
  limit: z.number().int().min(1).max(20).default(10),
});

export const placeRoutes: FastifyPluginAsync = async (app) => {
  const seeding = new Set<string>();

  app.get('/places', async (request) => ({
    places: await listPlaces(parse(ListQuery, request.query)),
  }));

  app.get('/places/:id', async (request) => {
    const { id } = parse(IdParams, request.params);
    const place = await getPlace(id);
    if (!place) throw AppError.notFound('Place');
    return { place };
  });

  // Seeding fetches from Overpass and queues embeddings, so it is restricted to known cities,
  // serialized per city, and tightly rate limited.
  app.post(
    '/places/seed',
    { preHandler: requireAuth, config: { rateLimit: { max: 2, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const { city: requested } = parse(SeedBody, request.body);
      const city = findCity(requested);
      if (!city) {
        throw new AppError(400, 'VALIDATION_ERROR', `Unsupported city "${requested}"`, {
          supported: Object.values(CITIES).map((c) => c.name),
        });
      }
      const key = city.name.toLowerCase();
      if (seeding.has(key)) throw AppError.conflict(`${city.name} is already being seeded`);

      seeding.add(key);
      void seedCity(city)
        .then((result) => request.log.info({ city: city.name, ...result }, 'city seeded'))
        .catch((err: unknown) => request.log.error({ city: city.name, err }, 'city seed failed'))
        .finally(() => seeding.delete(key));

      return reply.status(202).send({ status: 'started', city: city.name });
    },
  );

  app.post('/places/search/semantic', { preHandler: requireAuth }, async (request) => {
    const { query, city, limit } = parse(SearchBody, request.body);
    return { results: await semanticSearchPlaces(query, city, limit) };
  });
};
