import { describe, it, expect } from 'vitest';

import { buildFallbackItinerary, normalizeItineraryLegs, pathDistanceKm } from '../itinerary.js';

import { makePlace } from './fixtures.js';

const candidates = [
  makePlace({ id: 'a', name: 'A', lat: 43.65, lng: -79.38 }),
  makePlace({ id: 'b', name: 'B', lat: 43.9, lng: -79.9 }),
  makePlace({ id: 'c', name: 'C', lat: 43.651, lng: -79.381 }),
  makePlace({ id: 'd', name: 'D', lat: 43.7, lng: -79.4 }),
];

describe('normalizeItineraryLegs', () => {
  it('drops hallucinated ids and dedupes, renumbering order from 1', () => {
    const legs = normalizeItineraryLegs(
      [
        { placeId: 'c', order: 2, rationale: 'second' },
        { placeId: 'ghost', order: 1 },
        { placeId: 'a', order: 3 },
        { placeId: 'a', order: 4 },
      ],
      candidates,
      2,
    );
    expect(legs.map((l) => l.placeId)).toEqual(['c', 'a']);
    expect(legs.map((l) => l.order)).toEqual([1, 2]);
    expect(legs[0]?.note).toBe('second');
  });

  it('pads to minStops from unused candidates in rank order', () => {
    const legs = normalizeItineraryLegs([{ placeId: 'd', order: 1 }], candidates, 3);
    expect(legs.map((l) => l.placeId)).toEqual(['d', 'a', 'b']);
  });

  it('enriches coords from candidates and respects maxStops', () => {
    const legs = normalizeItineraryLegs(
      [
        { placeId: 'a', order: 1 },
        { placeId: 'b', order: 2 },
        { placeId: 'c', order: 3 },
      ],
      candidates,
      1,
      2,
    );
    expect(legs).toHaveLength(2);
    expect(legs[1]).toMatchObject({ placeId: 'b', lat: 43.9, lng: -79.9 });
  });
});

describe('buildFallbackItinerary', () => {
  it('walks nearest-neighbour from the top candidate', () => {
    const legs = buildFallbackItinerary(candidates, 3, 4);
    expect(legs.map((l) => l.placeId)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('stops at maxStops', () => {
    expect(buildFallbackItinerary(candidates, 2, 3)).toHaveLength(3);
  });

  it('throws when there are too few candidates', () => {
    expect(() => buildFallbackItinerary(candidates.slice(0, 2), 3, 5)).toThrow();
    expect(() => buildFallbackItinerary([], 1, 2)).toThrow();
  });
});

describe('pathDistanceKm', () => {
  it('sums haversine legs in order', () => {
    // 0.01 degrees of latitude is ~1.11 km
    const d = pathDistanceKm([
      { lat: 43.65, lng: -79.38 },
      { lat: 43.66, lng: -79.38 },
      { lat: 43.67, lng: -79.38 },
    ]);
    expect(d).toBeCloseTo(2.22, 1);
  });

  it('is zero for fewer than two points', () => {
    expect(pathDistanceKm([])).toBe(0);
    expect(pathDistanceKm([{ lat: 1, lng: 1 }])).toBe(0);
  });
});
