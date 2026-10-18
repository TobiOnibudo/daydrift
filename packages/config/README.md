# @daydrift/config

**Purpose:** The single source of truth (SSOT) for environment configuration — parses and validates `process.env` once with Zod and exposes a typed, frozen `config`.

**What it does / exports:** `config` (typed frozen object), `EMBEDDING_DIM` (derived vector dimension), and the inferred `Config` type. It is the root of the dependency graph and imports nothing else internal.

**How to run:** Not a runnable service. Build with `pnpm --filter @daydrift/config build`; imported by other packages.

**Dependencies:** None internal. External: `zod`.

**Env vars read:** All of them — `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `BASE_URL`, `WEB_URL`, `LLM_*`, `OPENAI_API_KEY`, `EMBEDDING_*`, `OLLAMA_BASE_URL`, `NOMINATIM/OVERPASS/OSRM_BASE_URL`, `VITE_API_URL`, `NODE_ENV`, `PORT`. See docs/08-config-env.md.

**Gotchas:**

- `AUTH_SECRET` has **no default** — missing it always throws (v1 problem #5).
- In `production`, `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `LLM_PROVIDER`, and `EMBEDDING_MODEL` (plus `OPENAI_API_KEY` when provider is `openai`) are required. `VITE_API_URL` is optional and is used only as a legacy server-side proxy target by the separately deployed web process.
- `EMBEDDING_DIM` is derived from `EMBEDDING_MODEL` via a built-in map; for unknown models it must be set explicitly, and if set for a known model it must match.
