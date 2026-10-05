# trips

What's in here: `repository.ts`, the Drizzle queries for trips (insert, claim, complete, fail, list, delete, reset) and the row-to-`Trip` mapping.

How it fits: shared so the API and the worker agree on trip state transitions (`pending` to `processing` to `complete` or `failed`). Every user-facing read is scoped by `userId`.
