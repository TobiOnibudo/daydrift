# @daydrift/core

**Purpose:** Shared trip-planning domain logic used by both the API and the worker.

**What it does / exports:**

- `retrieval/` — `searchCandidatePlaces()`: embed → vector top-k → re-rank → diversify (15).
- `itinerary.ts` — `normalizeItineraryLegs()`, `buildFallbackItinerary()`.
- `osrm.ts` — `fetchRoute()`: mode-aware OSRM route geometry + distance.

**How to run:** Imported as a library — `pnpm --filter @daydrift/core build`.

**Dependencies:** `@daydrift/db`, `@daydrift/ai`, `@daydrift/types`, `@daydrift/config`.

**Env vars read:** `OSRM_BASE_URL` (+ embedding/LLM vars via `@daydrift/ai`) — via `@daydrift/config` (see docs/08).

**Gotchas:** All functions are stubs. The RAG pipeline they implement is specified in docs/03-rag-pipeline.md (§3–9).
