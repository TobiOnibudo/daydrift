# @daydrift/auth

**Purpose:** Better Auth configuration (sessions, email/password, OAuth) for the API.

**What it does / exports:** `auth` (the configured Better Auth instance) and `fromNodeHeaders` re-exported from `better-auth/node`.

**How to run:** Imported by `apps/api`, which mounts the handler at `/api/v1/auth/*`.

**Dependencies:** `@daydrift/db` (Drizzle adapter), `@daydrift/config`.

**Env vars read:** `AUTH_SECRET`, `BASE_URL`, `WEB_URL`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET` — via `@daydrift/config` (see docs/08).

**Gotchas:** `AUTH_SECRET` has no insecure default — the process fails fast if unset. OAuth providers are only enabled when their client id is configured. See docs/04-api.md §3.
