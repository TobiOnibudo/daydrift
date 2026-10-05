# @daydrift/api

Fastify web service: REST under `/api/v1`, Better Auth at `/api/v1/auth/*`, SSE relay of worker progress. It enqueues `ai-plan` jobs; it does **not** run the RAG pipeline (see [docs/01](../../docs/01-architecture.md)).

## Layout

| Path                | Role                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| `src/app.ts`        | `buildApp()`: plugins, queue, routes. Importable without listening (tests). |
| `src/server.ts`     | Entry point: listen and graceful shutdown.                                  |
| `src/routes/`       | health, places, trips, and SSE route modules.                               |
| `src/plugins/`      | `requireAuth`, Better Auth mount, central error handler.                    |
| `src/lib/errors.ts` | `AppError`, the error envelope, and `parse()` for Zod validation.           |

## Behavior worth knowing

- `POST /trips` normalizes the input and checks the result cache first; a hit creates an already-complete trip without enqueueing.
- `GET /trips/:id/stream` subscribes before checking stored status, so a client that connects after the worker finished still gets the terminal event.
- `POST /places/seed` is limited to known cities, serialized per city, and rate limited.

## Scripts

`dev` (tsx watch), `build`, `start`, `typecheck`, `lint`, `test` (vitest), `clean`. Full contract: [docs/04](../../docs/04-api.md).
