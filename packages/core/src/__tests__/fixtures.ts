import type { Place } from '@daydrift/types';

export function makePlace(overrides: Partial<Place> & { id: string }): Place {
  return {
    name: `Place ${overrides.id}`,
    city: 'toronto',
    category: 'cafe',
    description: null,
    lat: 43.65,
    lng: -79.38,
    osmId: `node/${overrides.id}`,
    tags: {},
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}
