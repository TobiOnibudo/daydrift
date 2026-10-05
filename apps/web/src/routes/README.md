# routes

Route-level screens. Each composes components and hooks; data fetching stays in `hooks/`.

| File                 | Route        | Notes                                                          |
| -------------------- | ------------ | -------------------------------------------------------------- |
| `LandingPage.tsx`    | `/`          | Hero with the signature route trace.                           |
| `AuthPage.tsx`       | `/auth`      | Sign in / sign up; returns visitors to where they were headed. |
| `PlanPage.tsx`       | `/plan`      | Loads cities, creates the trip, navigates to it.               |
| `TripsPage.tsx`      | `/trips`     | History with delete.                                           |
| `TripPage.tsx`       | `/trips/:id` | Generating, failed, or finished; share, regenerate, delete.    |
| `SharedTripPage.tsx` | `/s/:token`  | Public read-only trip.                                         |
| `NotFoundPage.tsx`   | `*`          |                                                                |

`TripPage` and `SharedTripPage` are lazy-loaded so the map library only downloads when a trip opens.
