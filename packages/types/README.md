# @daydrift/types

**Purpose:** The SSOT for data shapes — Zod schemas and their inferred TypeScript types, shared across every app and package.

**What it does / exports:** Schemas and types for `PlaceCategory`, `Place`, `TripStatus`, `Duration`, `TravelMode`, `CreateTripInput`, `TripLeg`, and `Trip` (each as a `*Schema` plus an inferred type).

**How to run:** Not a runnable service. Build with `pnpm --filter @daydrift/types build`; imported by other packages.

**Dependencies:** `@daydrift/config` (for the embedding dimension). External: `zod`.

**Env vars read:** None directly. Reads `EMBEDDING_DIM` via `@daydrift/config` to pin the embedding vector length (see docs/08).

**Gotchas:** Keep these schemas aligned with the Drizzle tables in `@daydrift/db` (docs/02) — they are the shared contract between the API, worker, and web.
