# routes

Route modules for `@daydrift/api`. `v1Routes` (in `index.ts`) mounts everything below under `/api/v1`; `healthRoutes` is mounted at the root.

| File        | Routes                                                                                 |
| ----------- | -------------------------------------------------------------------------------------- |
| `health.ts` | `GET /health` (liveness), `GET /health/ready` (Postgres + Redis).                      |
| `places.ts` | `GET /places`, `GET /places/:id`, `POST /places/seed`, `POST /places/search/semantic`. |
| `trips.ts`  | Create (cache-first), list, get, status, delete, regenerate. All require auth.         |
| `sse.ts`    | `GET /trips/:id/stream`: SSE relay of worker events.                                   |

Validation uses Zod via `parse()`; errors use the envelope in `lib/errors.ts`. See [docs/04](../../../../docs/04-api.md).
