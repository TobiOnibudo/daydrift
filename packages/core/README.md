# @daydrift/core

**Purpose:** Shared trip-planning domain logic used by both the API and the worker, so pipeline behavior cannot drift between enqueue time and run time.

**What it exports:**

- `retrieval/` — `searchCandidatePlaces()` (embed, HNSW top-k, re-rank, diversify to 15) and `semanticSearchPlaces()`.
- `prompt.ts`, `schemas.ts` — itinerary/narrative prompts, stop ranges, and the structured-output schema.
- `itinerary.ts`, `osrm.ts` — leg normalization, proximity fallback, route geometry (mode-aware OSRM).
- `normalization.ts`, `trip-cache.ts` — canonical input + hash, and the `trip:result:<hash>` cache.
- `trips/`, `places/` — Drizzle repositories shared by the API and worker.
- `seeding/` — Overpass ingestion and the embedding processor (`pnpm seed`).
- `evals/` — retrieval quality metrics and runner (`pnpm eval`).

**How to run:** Library. `pnpm --filter @daydrift/core test` (unit tests, no infra needed), `pnpm seed`, `pnpm eval`.

**Dependencies:** `@daydrift/db`, `@daydrift/ai`, `@daydrift/queue`, `@daydrift/types`, `@daydrift/config`.

**Env vars read:** via `@daydrift/config` (docs/08): `DATABASE_URL`, `REDIS_URL`, `OSRM_BASE_URL`, plus LLM/embedding settings through `@daydrift/ai`.

**Gotchas:** Changing the embedding model changes the vector dimension; re-provision `places.embedding` and re-embed (docs/02). Redis is created lazily, so importing core never opens a socket.
