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

Requires Node 20, pnpm 9, Docker, and (for local AI) Ollama. See
[docs/07-local-dev.md](./docs/07-local-dev.md).

## Repo map

| Path            | What                                              |
| --------------- | ------------------------------------------------- |
| apps/api        | HTTP API (REST + SSE), serves the SPA             |
| apps/worker     | Background trip-generation jobs                   |
| apps/web        | Vite + React SPA                                  |
| packages/config | Env SSOT (Zod), fail-fast validation              |
| packages/db     | Drizzle schema + migrations (Postgres + pgvector) |
| packages/core   | Retrieval, scoring, itinerary, routing            |
| packages/ai     | LLM + embedding clients (Vercel AI SDK)           |
| packages/queue  | BullMQ setup                                      |
| packages/auth   | Better Auth config                                |
| packages/types  | Shared Zod schemas + types                        |

Full specification: [/docs](./docs).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Commits follow Conventional Commits; every
new folder of substance gets a `README.md`.
