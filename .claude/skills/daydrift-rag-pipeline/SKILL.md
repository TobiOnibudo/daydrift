---
name: daydrift-rag-pipeline
description: Use when editing retrieval, embedding, vector search, prompt building, caching, or generation/streaming logic in packages/core, or working on the RAG pipeline. Covers embedding-dim SSOT, HNSW search, cache keys, and fallback paths.
---

# Work inside the Daydrift RAG pipeline

The retrieval/generation core lives in `packages/core`. See `docs/02-data-model.md` and `docs/03-rag-pipeline.md`.

## Invariants

- **Embedding dimension is a single source of truth** (`EMBEDDING_DIM` from `packages/config`). Never hardcode a divergent value or the DB column and query vectors will mismatch.
- **Cache keys are deterministic and collision-safe.** Respect the existing layers: `trip:result:<input_hash>` and `places:city:<city>`. Normalize inputs before hashing.
- **Use HNSW vector search** as specified; always embed the query (no skip hack).
- **Preserve the fallback path** — `buildFallbackItinerary` runs before a trip is ever marked `failed`.
- Keep prompt building and `generateObject`/`streamText` aligned with the documented contract.

## Checklist

- [ ] No hardcoded embedding dimension
- [ ] Deterministic cache keys, correct invalidation
- [ ] Query always embedded; HNSW search used
- [ ] Fallback path intact
