# evals

What's in here: offline measurement of retrieval quality against the seeded database.

| File                    | Role                                                                           |
| ----------------------- | ------------------------------------------------------------------------------ |
| `metrics.ts`            | precision@k, recall@k, NDCG@k, reciprocal rank (pure).                         |
| `ground-truth.ts`       | Queries with relevance predicates over place attributes (ids change per seed). |
| `evaluate-retrieval.ts` | Runs a retriever over the cases; `findRegressions()` compares to a baseline.   |
| `cli.ts`                | `pnpm eval` (exit 1 on regression); `pnpm eval --update-baseline` records one. |

How it fits: needs a seeded, embedded city. Reports go to `packages/core/evals/results/` (gitignored); the baseline lives in `packages/core/evals/baseline.json`.
