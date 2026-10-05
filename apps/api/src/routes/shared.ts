import { getSharedTrip } from '@daydrift/core';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { AppError, parse } from '../lib/errors.js';

const TokenParams = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/) });

/** Public, read-only access to a trip its owner chose to share. The token is the only credential. */
export const sharedRoutes: FastifyPluginAsync = async (app) => {
  app.get('/shared/:token', async (request, reply) => {
    const { token } = parse(TokenParams, request.params);
    const trip = await getSharedTrip(token);
    if (!trip) throw AppError.notFound('Shared trip');
    reply.header('Cache-Control', 'private, no-store');
    return { trip };
  });
};
