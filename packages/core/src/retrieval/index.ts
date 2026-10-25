import { embed } from '@daydrift/ai';
import type { CreateTripInput, Place } from '@daydrift/types';

import { getCityPlacePool, setCityPlacePool } from './cache.js';
import { selectDiverseCandidates } from './diversity.js';
import { buildSearchQuery } from './query-builder.js';
import { scoreWithLexicalBoost } from './scoring.js';
import { loadCityPool, vectorSearch } from './vector-search.js';

export const VECTOR_TOP_K = 50;
export const MIN_CANDIDATE_POOL = 20;
export const CANDIDATE_LIMIT = 15;

/**
 * Retrieve, score and diversify candidate places for a trip request (docs/03 §3-4):
 * embed the query, HNSW top-k in the city, top up from the cached city pool when results
 * are thin, lexical-boost re-rank, then pick enough places spread across categories and areas for
 * the requested itinerary.
 */
export async function searchCandidatePlaces(input: CreateTripInput): Promise<Place[]> {
  const queryEmbedding = await embed(buildSearchQuery(input));
  const wanted = Math.max(CANDIDATE_LIMIT, input.stopCount ?? CANDIDATE_LIMIT);
  let results = await vectorSearch(queryEmbedding, input.city, Math.max(VECTOR_TOP_K, wanted));

  if (results.length < Math.max(MIN_CANDIDATE_POOL, wanted)) {
    let pool = await getCityPlacePool(input.city);
    if (!pool) {
      pool = await loadCityPool(input.city);
      if (pool.length > 0) await setCityPlacePool(input.city, pool);
    }
    const seen = new Set(results.map((p) => p.id));
    results = [...results, ...pool.filter((p) => !seen.has(p.id))];
  }

  return selectDiverseCandidates(scoreWithLexicalBoost(results, input.interests), wanted);
}

export { invalidateCityPlacePool } from './cache.js';
