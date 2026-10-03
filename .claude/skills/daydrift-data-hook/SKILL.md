---
name: daydrift-data-hook
description: Use when adding a data-fetching or mutation hook on the frontend, calling an API from React, managing query cache or invalidation, or consuming an SSE/EventSource stream for live trip updates. Covers TanStack Query patterns and cache keys.
---

# Add a Daydrift data hook

TanStack Query hooks and SSE consumption. See `docs/04-api.md` and `docs/05-frontend.md`.

## Steps

1. Follow the query/mutation pattern with **stable, documented cache keys** (e.g. `['trips']`, `['trip', id]`).
2. After a mutation, invalidate the correct keys (creating a trip invalidates `['trips']`). Handle loading and error states.
3. For trip streaming, consume the SSE endpoint `/api/v1/trips/:id/stream` via native **`EventSource`** in a dedicated hook (not TanStack Query). Clean up the connection on unmount; close on `complete`/`failed`.
4. Type hooks from the shared `packages/types` schemas — no inline shapes.

## Checklist

- [ ] Stable cache keys, documented
- [ ] Correct invalidation after mutations
- [ ] `EventSource` cleaned up on unmount
- [ ] Types sourced from `packages/types`
