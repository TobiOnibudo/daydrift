---
name: daydrift-migration
description: Use when changing the database schema, generating or applying a Drizzle migration, or altering tables, indexes, or vector/embedding columns. Covers embedding-dim and HNSW index caveats and the no-runtime-migration rule.
---

# Generate and apply a Daydrift migration

Drizzle migrations for `packages/db`. See `docs/02-data-model.md`.

## Steps

1. Edit the Drizzle schema in `packages/db/src/schema.ts` first. Then generate the migration with `pnpm db:generate` — never hand-write generated SQL blindly.
2. **Vector columns:** the `places.embedding` dimension comes from `EMBEDDING_DIM` (`packages/config`). Changing the embedding model changes the dimension, which requires re-provisioning the column, re-embedding all rows, and rebuilding the **HNSW** index — not just an `ALTER`.
3. Apply migrations explicitly with `pnpm db:migrate`. **Never auto-migrate at runtime** — production migrations run only in Railway's preDeploy step.
4. Review the generated SQL before committing it.

## Checklist

- [ ] Schema edited, then `pnpm db:generate`
- [ ] Vector/HNSW caveats handled if the embedding column changed
- [ ] Generated SQL reviewed
- [ ] No runtime auto-migration introduced
