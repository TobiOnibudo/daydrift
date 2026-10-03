# @daydrift/queue

**Purpose:** BullMQ setup for Daydrift's single background queue (`ai-plan`).

**What it does / exports:** `AI_PLAN_QUEUE`, `AiPlanJobData`, `createAiPlanQueue()`, `createAiPlanWorker(processor)`, `createRedisConnection()`.

**How to run:** Imported as a library — `pnpm --filter @daydrift/queue build`.

**Dependencies:** `@daydrift/config`, `@daydrift/types`.

**Env vars read:** `REDIS_URL` — via `@daydrift/config` (see docs/08).

**Gotchas:** There is deliberately only one queue (docs/01). The ioredis connection sets `maxRetriesPerRequest: null` as BullMQ requires. Worker `lockDuration` is ~10min to survive slow LLM generation (docs/09).
