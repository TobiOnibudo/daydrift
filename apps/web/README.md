# @daydrift/web

The Daydrift SPA: **Vite + React 18 + TypeScript (strict) + Tailwind**. It talks to the Fastify API over REST plus one SSE endpoint for streaming trip generation. Spec: [docs/05-frontend.md](../../docs/05-frontend.md).

## Running it

- `pnpm dev` (from the repo root) starts Vite on :5173 and **proxies `/api` to the API on :3000**, so the browser sees one origin, exactly like production. Cookies, SSE and CORS just work. Point `API_PROXY_TARGET` elsewhere if needed.
- `pnpm build` emits `dist/`; the API serves it (with immutable caching for hashed assets and a client-route fallback), so production is a single service. Set `VITE_API_URL` only if the API lives on another origin.
- `pnpm test` runs Vitest + Testing Library (jsdom).

## Screens

| Route        | Screen                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| `/`          | Landing                                                                                                     |
| `/auth`      | Sign in / create account                                                                                    |
| `/plan`      | Plan a trip (city, interests, length, travel mode)                                                          |
| `/trips`     | Your trips (open, delete)                                                                                   |
| `/trips/:id` | Live generation (stepper + streaming narrative), then the finished trip with map; regenerate, share, delete |
| `/s/:token`  | Public, read-only shared trip                                                                               |

## Stack and layers

- **TanStack Query** for all server state. The only `fetch` lives in `src/lib/api.ts`; components use hooks.
- **Native `EventSource`** (`useTripStream`) for generation progress, deliberately not Query.
- **Leaflet / react-leaflet** map with the route overlay and numbered markers; loaded lazily with the trip routes.
- **Design system:** tokens in `tailwind.config.js` + `src/styles/index.css` (warm paper and ink, coral accent, Fraunces + Inter). The **signature** is the dashed route line linking numbered waypoints (logo, hero, stepper, itinerary timeline, map markers).
- **shadcn-style primitives** are owned in `src/components/ui/`. **Framer Motion** handles transitions and reveals, and `MotionConfig reducedMotion="user"` plus a CSS media query honor `prefers-reduced-motion`.

## Rules

- Import only **types** from `@daydrift/types`; its runtime pulls in Node-only config.
- Presentational components take props; data hooks own fetching. Keep that boundary.
- Every interactive element needs a visible focus ring (global `:focus-visible`), a label, and keyboard support.
