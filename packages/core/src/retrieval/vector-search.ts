import { db, places } from '@daydrift/db';
import type { Place } from '@daydrift/types';
import { and, cosineDistance, eq, isNotNull } from 'drizzle-orm';

import { placeColumns } from './columns.js';

/** Top-`limit` places in `city` by cosine distance to the query vector (served by the HNSW index). */
export async function vectorSearch(
  queryEmbedding: number[],
  city: string,
  limit: number,
): Promise<Place[]> {
  return db
    .select(placeColumns)
    .from(places)
    .where(and(eq(places.city, city.trim().toLowerCase()), isNotNull(places.embedding)))
    .orderBy(cosineDistance(places.embedding, queryEmbedding))
    .limit(limit);
}

/** Every embedded place in a city, without vectors; the fallback pool for thin results. */
export async function loadCityPool(city: string): Promise<Place[]> {
  return db
    .select(placeColumns)
    .from(places)
    .where(and(eq(places.city, city.trim().toLowerCase()), isNotNull(places.embedding)));
}
