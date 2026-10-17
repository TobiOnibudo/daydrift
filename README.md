# Daydrift

Daydrift plans city trips from natural-language prompts using a RAG pipeline over
geospatial place data. A user enters a city, interests, duration, and travel mode;
Daydrift returns an AI-generated multi-stop itinerary with a map route.

## Architecture

```
web (SPA) ──► api (HTTP) ──► core ──► ai / db
                  │
                  └──► queue ──► worker ──► ai / db
Postgres+pgvector · Redis
```

Two deployable processes (an `api` web service and a background `worker`) plus a static
SPA served by the API. See [docs/01-architecture.md](./docs/01-architecture.md).

## Quick start

```bash
pnpm install && pnpm setup && pnpm dev
```

- `pnpm install` — install workspace dependencies.
- `pnpm setup` — copy `.env`, start Postgres + Redis, migrate, seed a sample city (idempotent).
- `pnpm dev` — run `api`, `worker`, and `web` together via Turbo.

Requires Node 22.12 or newer, pnpm 9, Docker, and (for local AI) Ollama with `nomic-embed-text` and `llama3.2:3b` pulled.
If ports 5432/6379 are taken, set `POSTGRES_PORT`/`REDIS_PORT` in `.env` and match them in `DATABASE_URL`/`REDIS_URL`.
Local LLMs are slow on CPU; raise `LLM_TIMEOUT_MS` or use a hosted model. On timeout the worker falls back to a proximity itinerary. See
[docs/07-local-dev.md](./docs/07-local-dev.md).

## Testing

| Command                 | What it runs                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`             | Unit and component tests (no infrastructure needed).                                                                                                                |
| `pnpm test:integration` | Repositories, caches, vector search and the dimension guard against real Postgres + Redis (isolated `daydrift_test` DB).                                            |
| `pnpm e2e`              | Playwright journeys, error workflows and WCAG checks on a full stack (API + worker + built SPA) with an offline mock AI provider, so no Ollama or OpenAI is needed. |
| `pnpm load`             | Load test of reads, cached trip creation and queue throughput on the same hermetic stack.                                                                           |
| `pnpm eval`             | Retrieval quality (precision, recall, NDCG, MRR) against the seeded database; `--update-baseline` records a new baseline.                                           |

CI runs all of the above except `eval`/`load` against Postgres and Redis service containers.

## Deploying

The API serves the built SPA, so production is two services plus Postgres and Redis. See
[deploy/railway/README.md](./deploy/railway/README.md) for the Railway config, environment variables
(including the embedding-dimension note), and the first-deploy checklist.

## Repo map

| Path            | What                                                 |
| --------------- | ---------------------------------------------------- |
| apps/api        | HTTP API (REST + SSE), serves the SPA                |
| apps/worker     | Background trip-generation jobs                      |
| apps/web        | Vite + React SPA                                     |
| packages/config | Env SSOT (Zod), fail-fast validation                 |
| packages/db     | Drizzle schema + migrations (Postgres + pgvector)    |
| packages/core   | Retrieval, scoring, itinerary, routing               |
| packages/ai     | LLM + embedding clients (Vercel AI SDK)              |
| packages/queue  | BullMQ setup                                         |
| packages/auth   | Better Auth config                                   |
| packages/types  | Shared Zod schemas + types                           |
| e2e             | Playwright end-to-end, accessibility, and load tests |
| deploy/railway  | Railway service configs and deployment guide         |

Full specification: [/docs](./docs).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Commits follow Conventional Commits; every
new folder of substance gets a `README.md`.
