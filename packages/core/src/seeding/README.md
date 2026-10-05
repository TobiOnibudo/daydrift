# seeding

What's in here: ingesting a city's places from OpenStreetMap and getting them embedded.

| File             | Role                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `cities.ts`      | Registry of seedable cities and bounding boxes.                                          |
| `overpass.ts`    | Overpass query builder/parser with a mirror fallback.                                    |
| `mapping.ts`     | OSM tags to canonical categories, per-category caps, embedding text.                     |
| `seed-city.ts`   | `seedCity()`: fetch, insert new places, enqueue an embed job for every unembedded place. |
| `embed-place.ts` | BullMQ processor that embeds one place (run by the worker).                              |
| `cli.ts`         | `pnpm seed [city]`.                                                                      |

How it fits: `seedCity` is idempotent, so re-running it also resumes interrupted embedding. The worker must be running for embeddings to complete.
