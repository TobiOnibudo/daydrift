# components

Presentational product components: they receive props and render, never fetch.

| File                                         | Role                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `AppShell`, `Logo`, `ProtectedRoute`         | Layout, skip link, nav; auth gate for signed-in routes.                |
| `PlanForm`                                   | City, interest chips, length, travel mode.                             |
| `TripGenerationView`                         | SSE-driven view: `ProgressStepper` + `StreamingNarrative` + skeletons. |
| `TripResultView`, `ItineraryList`, `TripMap` | Finished trip: facts, timeline, Leaflet route map.                     |
| `TripCard`                                   | A row in the trip history.                                             |
| `states`, `ErrorBoundary`                    | `ErrorState` / `EmptyState`; last-resort render-error boundary.        |
| `route/RouteTrace`                           | The animated signature route line (decorative, reduced-motion aware).  |
| `ui/`                                        | Owned shadcn-style primitives.                                         |

The streaming region is `aria-live="polite"`; errors use `role="alert"`.
