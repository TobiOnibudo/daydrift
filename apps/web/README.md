# @daydrift/web

The Daydrift v2 frontend: an AI trip-planner **SPA** built with **Vite + React 18 + TypeScript (strict) + Tailwind**. It talks to the Fastify backend over REST plus one SSE endpoint for streaming generation. Full spec: [docs/05-frontend.md](../../docs/05-frontend.md).

## Stack

- **Vite** build / dev server, **React 18** runtime, **React Router** for client-side routing.
- **TanStack Query** for all server state — components never call `fetch`; the only `fetch` lives in `src/lib/api.ts`.
- **Leaflet** / **react-leaflet** for the interactive map (GeoJSON route + numbered leg markers).
- Streaming generation uses the **native `EventSource`** via `useTripStream` (not Query).

## UI toolkit & design system

Deliberate, non-templated feel with strict layer roles (see docs/05 §6 and the `daydrift-ui-component` / `daydrift-design-system` skills in [docs/13](../../docs/13-project-skills.md)):

- **shadcn/ui** — foundation; source owned in-repo (`src/components/ui/`).
- **Tailwind tokens** — color, spacing, radius, type scale defined once (`tailwind.config.js` + `src/styles/index.css`).
- **Framer Motion** — primary animation layer: route transitions, streaming reveal, marker entrance.
- **Magic UI / Aceternity / React Bits** — selective accents on high-impact surfaces only; respect `prefers-reduced-motion`.
- Use the `frontend-design` skill for aesthetic direction.

## Scripts

| Script           | Purpose                          |
| ---------------- | -------------------------------- |
| `pnpm dev`       | Vite dev server (port 5173)      |
| `pnpm build`     | Type-check then production build |
| `pnpm preview`   | Preview the production build     |
| `pnpm typecheck` | `tsc --noEmit`                   |
| `pnpm lint`      | ESLint over `src`                |
| `pnpm clean`     | Remove `dist`                    |

## Environment

- `VITE_API_URL` — backend origin (e.g. `http://localhost:3000`). Consumed in `src/lib/api.ts`; the API base path is `/api/v1`.

## Structure

```
src/
  components/   # presentational product components
    ui/         # shadcn/ui source (owned)
  hooks/        # data + SSE hooks
  lib/          # http wrapper, query client, utils
  routes/       # route-level screens
  styles/       # Tailwind entry + tokens
```
