# hooks/

Data + SSE hooks — the boundary that encapsulates all server state, caching, and the streaming lifecycle (see [docs/05-frontend.md](../../../../docs/05-frontend.md) §2 & §3). Presentational components receive plain props and never fetch.

- `useTrips.ts` — TanStack Query hooks: `usePlaces`, `useTrip`, `useTrips`, plus `useCreateTrip` / `useDeleteTrip` / `useRegenerateTrip` mutations. Cache-key convention: `['trips']`, `['trip', id]`, `['places', query]`.
- `useTripStream.ts` — native `EventSource` hook for generation streaming (NOT Query). Owns its own reducer; tears down on unmount.
