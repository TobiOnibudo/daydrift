# Deploying to Railway

Two services from this repo plus two data services. The API serves the built SPA, so there is no separate frontend service and no cross-origin cookie setup.

| Service    | Config file                  | Notes                                                                                                                                                |
| ---------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api`      | `deploy/railway/api.json`    | Public. Runs migrations in `preDeploy`, health-checks `/health/ready`, serves REST, SSE, and the SPA.                                                |
| `worker`   | `deploy/railway/worker.json` | Private background worker (no port). Runs the `ai-plan` and `embed-place` queues.                                                                    |
| `postgres` | pgvector image               | Must have the `vector` extension available (for example `pgvector/pgvector:pg16`). The first migration runs `CREATE EXTENSION IF NOT EXISTS vector`. |
| `redis`    | Railway Redis                | BullMQ, caches, and the SSE pub/sub.                                                                                                                 |

For each app service, set **Settings > Config-as-code path** to its file above. Connect the repo and enable auto-deploy from `main` with "wait for CI" so a red build never ships.

## Environment variables

Set on **both** `api` and `worker` unless noted. Use Railway references for the data services.

| Variable                    | Value                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | `production`                                                                                                  |
| `DATABASE_URL`              | `${{Postgres.DATABASE_URL}}`                                                                                  |
| `REDIS_URL`                 | `${{Redis.REDIS_URL}}`                                                                                        |
| `AUTH_SECRET`               | `openssl rand -base64 32`. **Required**, no default. The app refuses to boot without it.                      |
| `BASE_URL`, `WEB_URL`       | Your public URL, for example `https://daydrift.example.com` (`api` only matters for auth callbacks and CORS). |
| `LLM_PROVIDER`, `LLM_MODEL` | `openai`, for example `gpt-4o-mini`                                                                           |
| `EMBEDDING_PROVIDER`        | `openai`                                                                                                      |
| `EMBEDDING_MODEL`           | `text-embedding-3-small`                                                                                      |
| `EMBEDDING_DIM`             | **`768`** (see below)                                                                                         |
| `OPENAI_API_KEY`            | Your key                                                                                                      |
| `LLM_TIMEOUT_MS`            | Optional, default `90000`                                                                                     |
| `OSRM_BASE_URL`             | Optional. The default public host is fine for light use; self-host OSRM for real traffic.                     |

### Embedding dimension

The committed migration creates `places.embedding` as `vector(768)`, matching the local dev model (`nomic-embed-text`). OpenAI's `text-embedding-3-small` is natively 1536-dimensional but supports shortened output, so set **`EMBEDDING_DIM=768`** and the app requests exactly 768 from OpenAI. One schema then serves both environments. Both services verify the column dimension against the configured model at startup and refuse to run on a mismatch, so a wrong value fails loudly at deploy time, not at the first insert.

Embeddings from different models are not comparable: seed and embed each environment with its own model.

## First deploy checklist

1. Create `postgres` (pgvector) and `redis`, then the `api` and `worker` services with the env above.
2. Deploy `api`. `preDeploy` applies migrations before the new release takes traffic.
3. Seed a city once (any machine with the production `DATABASE_URL` and `REDIS_URL`): `pnpm seed toronto`. The `worker` then embeds the places. Watch its logs until it goes quiet.
4. Open the public URL, create an account, and plan a trip.

## Scaling notes

- The worker runs one AI job at a time per instance (`concurrency: 1`); scale by adding worker replicas, not by raising concurrency against one provider key.
- Rate limits (API 300 per 15 minutes per client, trip creation 20) are per instance and keyed by client IP (`trustProxy` is on). Move them to Redis if you run several API replicas.
