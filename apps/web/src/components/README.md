# components/

Presentational product components (see [docs/05-frontend.md](../../../../docs/05-frontend.md) §3 & §6). They receive plain props and render — **no data fetching inside them**; data flows in from `hooks/`.

- `ui/` — shadcn/ui source (owned, customized in-repo).
- `TripGenerationView.tsx` — maps the SSE stream to the progress stepper + streaming narrative + skeletons.

Build components the Daydrift way: shadcn/ui base, Tailwind design tokens (no raw hex/px), Framer Motion for animation, gated behind `prefers-reduced-motion`. Use the `daydrift-ui-component` skill (see docs/13).
