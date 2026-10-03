# @daydrift/api

Fastify web service for Daydrift v2. Exposes the REST API under `/api/v1`, mounts
Better Auth at `/api/v1/auth/*`, relays worker progress over SSE, and serves the
built SPA. Enqueues `ai-plan` jobs for the worker; it does **not** run the RAG
pipeline itself (see [`docs/01-architecture.md`](../../docs/01-architecture.md)).

## Responsibilities

- Auth, places, and trips route modules (`src/routes`).
- `requireAuth` session validation (`src/plugins/auth.ts`).
- SSE stream relay backed by Redis pub/sub (`src/routes/sse.ts`).
- Central error envelope + rate limiting + CORS.

## Scripts

| Script      | Description               |
| ----------- | ------------------------- |
| `dev`       | `tsx watch src/server.ts` |
| `build`     | `tsc` → `dist`            |
| `start`     | `node dist/server.js`     |
| `typecheck` | `tsc --noEmit`            |
| `lint`      | `eslint src`              |
| `clean`     | `rimraf dist`             |

See [`docs/04-api.md`](../../docs/04-api.md) for the full API contract.
