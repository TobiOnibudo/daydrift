# @daydrift/ai

**Purpose:** Provider-agnostic LLM + embedding clients built on the Vercel AI SDK.

**What it does / exports:** `embed()`, `generateObject()`, `streamText()`, plus `getLanguageModel()` / `getEmbeddingModel()` provider resolvers.

**How to run:** Imported as a library — `pnpm --filter @daydrift/ai build`.

**Dependencies:** `@daydrift/config`, `@daydrift/types`.

**Env vars read:** `LLM_PROVIDER`, `LLM_MODEL`, `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL` (+ provider base URLs / keys) — via `@daydrift/config` (see docs/08).

**Gotchas:** The generic OpenAI-compatible provider branch is a TODO; only `ollama` and `openai` are wired. See docs/03-rag-pipeline.md §6.
