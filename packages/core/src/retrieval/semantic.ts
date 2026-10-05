import { embed } from '@daydrift/ai';
import type { Place } from '@daydrift/types';

import { vectorSearch } from './vector-search.js';

/** Free-text semantic search within a city: ranked by vector similarity, no diversification. */
export async function semanticSearchPlaces(
  query: string,
  city: string,
  limit: number,
): Promise<Place[]> {
  return vectorSearch(await embed(query), city, limit);
}
