# @daydrift/db

**Purpose:** Drizzle schema, Postgres client, and committed migrations for Daydrift (Postgres + pgvector).

**What it does / exports:** `db` (Drizzle client) and the schema tables (`places`, `trips`, plus a minimal `user` stub). See docs/02-data-model.md.

**How to run:** `pnpm --filter @daydrift/db generate` (author migrations), `migrate` (apply), `studio` (Drizzle Studio), `seed` (sample data). Not a long-running service.

**Dependencies:** `@daydrift/config` (connection string + `EMBEDDING_DIM`), `@daydrift/types`. External: `drizzle-orm`, `postgres`; dev: `drizzle-kit`, `tsx`.

**Env vars read:** `DATABASE_URL` and `EMBEDDING_DIM` — via `@daydrift/config` (see docs/08). `drizzle.config.ts` reads `DATABASE_URL` directly since it runs as a CLI.

**Gotchas:**

- The `places.embedding` column dimension comes from `EMBEDDING_DIM` (config SSOT) — changing the embedding model is a breaking schema change requiring a re-provision + re-embed (docs/02).
- Better Auth owns `user`/`session`/`account`/`verification`; the `user` here is a minimal stub managed by Better Auth's adapter — do not hand-edit its shape.
- Never auto-migrate at runtime; migrations run in Railway's `preDeploy` (docs/02).
