import type { Place, PlaceCategory } from '@daydrift/types';

export interface RetrievalCase {
  /** Short id used in reports. */
  id: string;
  query: string;
  city: string;
  /** Whether a place is a correct answer for the query. Predicates, not ids: ids change per seed. */
  isRelevant: (place: Place) => boolean;
}

const category =
  (...cats: PlaceCategory[]) =>
  (p: Place) =>
    cats.includes(p.category);

const text = (p: Place) =>
  [p.name, p.description ?? '', ...Object.values(p.tags ?? {})].join(' ').toLowerCase();

const restaurantMatching = (pattern: RegExp) => (p: Place) =>
  p.category === 'restaurant' && pattern.test(text(p));

export const retrievalGroundTruth: RetrievalCase[] = [
  {
    id: 'museums-art',
    query: 'art museums and galleries',
    city: 'toronto',
    isRelevant: category('museum', 'gallery'),
  },
  { id: 'coffee', query: 'cozy coffee shops', city: 'toronto', isRelevant: category('cafe') },
  {
    id: 'parks',
    query: 'parks and green space to relax',
    city: 'toronto',
    isRelevant: category('park'),
  },
  {
    id: 'history',
    query: 'historic landmarks and heritage sites',
    city: 'toronto',
    isRelevant: category('landmark'),
  },
  {
    id: 'theatre',
    query: 'live theatre and performances',
    city: 'toronto',
    isRelevant: category('theatre'),
  },
  {
    id: 'market',
    query: 'farmers market and food stalls',
    city: 'toronto',
    isRelevant: category('market'),
  },
  {
    id: 'views',
    query: 'scenic viewpoints with great views',
    city: 'toronto',
    isRelevant: category('viewpoint'),
  },
  {
    id: 'italian',
    query: 'italian restaurants, pizza and pasta',
    city: 'toronto',
    isRelevant: restaurantMatching(/italian|pizza|pasta|trattoria/),
  },
  {
    id: 'japanese',
    query: 'sushi and japanese food',
    city: 'toronto',
    isRelevant: restaurantMatching(/japanese|sushi|ramen|izakaya/),
  },
  {
    id: 'pubs',
    query: 'a pub for a drink and a pint',
    city: 'toronto',
    isRelevant: (p) => ['pub', 'bar'].includes(String(p.tags?.amenity ?? '')),
  },
];
