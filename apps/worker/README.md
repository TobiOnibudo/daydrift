# @daydrift/worker

Native **background worker** for Daydrift v2. It consumes the `ai-plan` BullMQ
queue (backed by Redis) and runs the full RAG pipeline from
[`docs/03-rag-pipeline.md`](../../docs/03-rag-pipeline.md): embed → vector
retrieve → score/diversify → prompt → `generateObject`/`streamText` → normalize →
OSRM route → persist. Progress is published to the Redis channel `trip:<id>`,
which the API relays to the browser over SSE.

## No HTTP surface

This process has **no HTTP server and no port** — it is a long-lived background
process restarted on crash by the platform. This is the intended fix for v1
problem #6 (workers deployed as web services). See
[`docs/01-architecture.md`](../../docs/01-architecture.md) §Process model.

## Scripts

| Script      | Description              |
| ----------- | ------------------------ |
| `dev`       | `tsx watch src/index.ts` |
| `build`     | `tsc` → `dist`           |
| `start`     | `node dist/index.js`     |
| `typecheck` | `tsc --noEmit`           |
| `lint`      | `eslint src`             |
| `clean`     | `rimraf dist`            |
