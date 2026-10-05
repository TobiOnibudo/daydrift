import { embed } from '@daydrift/ai';
import type { Place, Trip } from '@daydrift/types';

import { searchPlacesByName } from '../places/repository.js';
import { vectorSearch } from '../retrieval/vector-search.js';

export const SUGGESTION_LIMIT = 8;

export interface SuggestionDeps {
  byName: (city: string, query: string, limit: number) => Promise<Place[]>;
  semantic: (text: string, city: string, limit: number) => Promise<Place[]>;
}

const defaultDeps: SuggestionDeps = {
  byName: searchPlacesByName,
  semantic: async (text, city, limit) => vectorSearch(await embed(text), city, limit),
};

/**
 * Places the person might add or swap in: a name search when they type, otherwise the best matches
 * for the trip's own interests. Stops already in the trip are never offered.
 */
export async function suggestPlacesForTrip(
  trip: Pick<Trip, 'city' | 'interests' | 'legs'>,
  query: string | undefined,
  deps: SuggestionDeps = defaultDeps,
): Promise<Place[]> {
  const inTrip = new Set(trip.legs.map((l) => l.placeId));
  const wanted = SUGGESTION_LIMIT + inTrip.size; // room to drop the ones already used

  const term = query?.trim();
  const found = term
    ? await deps.byName(trip.city, term, wanted)
    : await deps.semantic(trip.interests.join(' ') || 'things to see and do', trip.city, wanted);

  return found.filter((p) => !inTrip.has(p.id)).slice(0, SUGGESTION_LIMIT);
}
