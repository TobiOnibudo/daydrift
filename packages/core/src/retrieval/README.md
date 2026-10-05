# retrieval

What's in here: the retrieval half of the RAG pipeline (docs/03 §3-4).

| File               | Role                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| `index.ts`         | `searchCandidatePlaces()`: orchestrates the steps below.                |
| `query-builder.ts` | Turns a trip request into the text that gets embedded.                  |
| `vector-search.ts` | HNSW cosine search (`vectorSearch`) and the city pool loader.           |
| `cache.ts`         | `places:city:<city>` pool cache (10 min); invalidated on re-seed.       |
| `scoring.ts`       | Vector-rank base score plus a lexical boost per matched interest.       |
| `diversity.ts`     | Greedy pick with category/area penalties, so results are not all cafes. |
| `semantic.ts`      | Plain semantic search (no diversification) for the API.                 |
| `columns.ts`       | Place columns minus the embedding, so vectors never leave the database. |

How it fits: called by the worker's ai-plan processor and by `POST /places/search/semantic`.
