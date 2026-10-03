import { auth, fromNodeHeaders } from '@daydrift/auth';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

// Augment FastifyRequest with the authenticated user id (declaration merging).
declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Build the standard { error: { code, message, details? } } envelope (docs/04 §2). */
export function errorEnvelope(code: string, message: string, details?: unknown): ErrorEnvelope {
  return details === undefined
    ? { error: { code, message } }
    : { error: { code, message, details } };
}

/**
 * Fastify preHandler that validates the Better Auth session (cookie or bearer)
 * and sets `request.userId`. Emits UNAUTHORIZED (401) when no valid session.
 */
export const requireAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (!session?.user?.id) {
    reply.status(401);
    return reply.send(errorEnvelope('UNAUTHORIZED', 'Authentication required'));
  }

  request.userId = session.user.id;
};
