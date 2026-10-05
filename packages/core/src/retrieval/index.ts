import { db, places } from '@daydrift/db';
import type { CreateTripInput, Place } from '@daydrift/types';
import { and, eq, isNotNull } from 'drizzle-orm';

import { getCityPlacePool, setCityPlacePool } from './cache.js';
import { selectDiverseCandidates } from './diversity.js';
import { buildSearchQuery } from './query-builder.js';
import { scoreWithLexicalBoost } from './scoring.js';
import { vectorSearch } from './vector-search.js';

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
export async function searchCandidatePlaces(input: CreateTripInput): Promise<Place[]> {
  const city = input.city.toLowerCase();

  // Check place-pool cache first
  let pool = await getCityPlacePool(city);

  if (!pool) {
    // Cache miss: fetch all city places from DB
    const dbPlaces = await db
      .select()
      .from(places)
      .where(and(eq(places.city, city), isNotNull(places.embedding)));

    pool = dbPlaces.map((r) => ({
      id: r.id,
      osmId: r.osmId,
      name: r.name,
      city: r.city,
      category: r.category as Place['category'],
      description: r.description,
      lat: r.lat,
      lng: r.lng,
      tags: r.tags as Record<string, string>,
      createdAt: r.createdAt,
    }));

    await setCityPlacePool(city, pool);
  }

  // Build semantic search query
  const query = buildSearchQuery(input);

  // Vector search over pool
  const results = await vectorSearch(query, city, 50);

  return selectDiverseCandidates(scoreWithLexicalBoost(results, input.interests), 15);
}
