import { auth, fromNodeHeaders } from '@daydrift/auth';
import type { FastifyPluginAsync } from 'fastify';

/** Mounts Better Auth at /api/v1/auth/* (sign-up, sign-in, sign-out, session). See docs/04 §3. */
export const betterAuthRoutes: FastifyPluginAsync = async (app) => {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/v1/auth/*',
    handler: async (request, reply) => {
      const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
      const response = await auth.handler(
        new Request(`${request.protocol}://${request.hostname}${request.url}`, {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
          body: hasBody ? JSON.stringify(request.body ?? {}) : undefined,
        }),
      );

      reply.status(response.status);
      // Login and registration responses must never be cached by a browser or intermediary.
      reply.header('Cache-Control', 'no-store');
      for (const [name, value] of response.headers) {
        if (name !== 'set-cookie') reply.header(name, value);
      }
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) reply.header('set-cookie', cookies);

      return reply.send(response.body ? await response.text() : null);
    },
  });
};
