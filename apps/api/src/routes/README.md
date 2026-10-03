# routes

Versioned HTTP route modules for `@daydrift/api`, mounted under `/api/v1`.

| File       | Routes                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| `index.ts` | Places (`/places*`) and trips (`/trips*`) REST endpoints.                 |
| `sse.ts`   | `GET /trips/:id/stream` — SSE relay of worker progress via Redis pub/sub. |

Auth is mounted separately in `server.ts` at `/api/v1/auth/*` (Better Auth handler).
See [`docs/04-api.md`](../../../docs/04-api.md) for the endpoint contract.
