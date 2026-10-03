# plugins

Fastify plugins and shared request-lifecycle helpers for `@daydrift/api`.

| File      | Purpose                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------- |
| `auth.ts` | `requireAuth` preHandler (Better Auth session → `request.userId`) and the `errorEnvelope` helper. |

Add new cross-cutting concerns (hooks, decorators, shared preHandlers) here.
