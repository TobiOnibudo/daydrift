import { embed } from '@daydrift/ai';
import type { Place } from '@daydrift/types';
// `embed` is the entry point for the retrieval pipeline (docs/03 §3).

export interface SearchCandidatesInput {
  city: string;
  interests: string[];
  duration: string;
  travelMode: string;
}

/**
 * Retrieve + score + diversify candidate places for a trip request.
 *
 * Pipeline (docs/03-rag-pipeline.md §3–4):
 *   1. Build a query string from normalized city + interests + duration/mode.
 *   2. embed(query) via @daydrift/ai (dimension = EMBEDDING_DIM).
 *   3. HNSW vector top-k over the per-city pool (`embedding <=> queryVec`).
 *   4. JS re-rank: vector distance + ILIKE interest boost (TEXT_MATCH_SCORE_BOOST).
 *   5. Fill to MIN_CANDIDATE_POOL if vector results are thin.
 *   6. selectDiverseCandidates → top 15 spread across categories/areas.
 *
 * @returns up to 15 diverse candidate places.
 */
export async function searchCandidatePlaces(_input: SearchCandidatesInput): Promise<Place[]> {
  // TODO: implement the pipeline above. `embed` is imported so the dependency
  // and call site are wired for the real implementation.
  void embed;
  return [];
}
