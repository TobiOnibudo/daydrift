import { auth, fromNodeHeaders } from '@daydrift/auth';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { AppError } from '../lib/errors.js';

// Augment FastifyRequest with the authenticated user id (declaration merging).
declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

/**
 * Validates the Better Auth session (cookie or bearer) and sets `request.userId`.
 * Throws UNAUTHORIZED (401) when there is no valid session.
 */
export const requireAuth: preHandlerAsyncHookHandler = async (request) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  if (!session?.user?.id) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  request.userId = session.user.id;
};
