// Binary-relevance ranking metrics. `rels` is the relevance (0/1) of each retrieved item, in rank order.

const hitsAtK = (rels: number[], k: number) => rels.slice(0, k).filter((r) => r > 0).length;

/** Fraction of the top-k results that are relevant. */
export function precisionAtK(rels: number[], k: number): number {
  return k > 0 ? hitsAtK(rels, k) / k : 0;
}

/**
 * Relevant results found in the top-k, out of the most that could fit: min(k, totalRelevant).
 * (Plain recall would cap below 1 whenever a city has more than k relevant places.)
 */
export function recallAtK(rels: number[], k: number, totalRelevant: number): number {
  const attainable = Math.min(k, totalRelevant);
  return attainable > 0 ? hitsAtK(rels, k) / attainable : 0;
}

/** Normalized discounted cumulative gain at k against an ideal ranking of `totalRelevant` hits. */
export function ndcgAtK(rels: number[], k: number, totalRelevant: number): number {
  const discount = (i: number) => 1 / Math.log2(i + 2);
  const dcg = rels.slice(0, k).reduce((sum, r, i) => sum + (r > 0 ? discount(i) : 0), 0);
  const idealHits = Math.min(k, totalRelevant);
  let idcg = 0;
  for (let i = 0; i < idealHits; i++) idcg += discount(i);
  return idcg > 0 ? dcg / idcg : 0;
}

/** Reciprocal rank of the first relevant result (0 if none). */
export function reciprocalRank(rels: number[]): number {
  const idx = rels.findIndex((r) => r > 0);
  return idx === -1 ? 0 : 1 / (idx + 1);
}
