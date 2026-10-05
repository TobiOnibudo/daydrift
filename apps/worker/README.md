# @daydrift/worker

Native **background worker** (no HTTP server, no port). It runs two BullMQ consumers:

- `ai-plan`: the RAG pipeline from [docs/03](../../docs/03-rag-pipeline.md). Retrieves candidates, generates a structured itinerary, streams a narrative, routes it, persists the trip, caches the result, and publishes progress to Redis channel `trip:<id>` (the API relays it over SSE).
- `embed-place`: embeds places enqueued by `pnpm seed`.

## Layout

| Path                            | Role                                                                    |
| ------------------------------- | ----------------------------------------------------------------------- |
| `src/index.ts`                  | Boot, exhausted-retry handling, graceful shutdown.                      |
| `src/processors/ai-plan.ts`     | The pipeline, with injected dependencies (unit-testable without infra). |
| `src/processors/deps.ts`        | Production wiring of those dependencies.                                |
| `src/processors/embed-place.ts` | Starts the embedding consumer.                                          |
| `src/events.ts`                 | Redis pub/sub publisher for trip events.                                |

## Failure behavior

If generation fails, a proximity-ordered fallback itinerary is saved (and not cached). The trip is only marked `failed` when no itinerary can be built. If OSRM is down the trip still completes, with a straight-line distance and no route geometry.

## Scripts

`dev` (tsx watch), `build`, `start`, `typecheck`, `lint`, `test` (vitest), `clean`.
