# places

What's in here: `repository.ts`, read queries for the public places catalog (`listPlaces`, `getPlace`). Embeddings are never selected.

How it fits: used by `GET /places` and `GET /places/:id`. Writes happen through `seeding/`.
