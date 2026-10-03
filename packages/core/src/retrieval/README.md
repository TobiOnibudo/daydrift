# retrieval

**What's in here:** The RAG retrieval stage — turning a normalized trip request into a short, diverse list of candidate places.

**Files:**

- `index.ts` — `searchCandidatePlaces()`: embed query → HNSW vector top-k → re-rank + ILIKE boost → diversify to 15.

**How it fits:** Called by the worker's planning flow (`packages/core` → `apps/worker`). Depends on `@daydrift/ai` (`embed`), `@daydrift/db` (places/pgvector), and `@daydrift/types` (`Place`). See docs/03-rag-pipeline.md §3–4.
