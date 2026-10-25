import { describe, expect, it, vi } from 'vitest';

import { buildEditedResult, TripEditError, type EditDeps } from '../trips/edit.js';
import {
  suggestPlacesForTrip,
  SUGGESTION_LIMIT,
  type SuggestionDeps,
} from '../trips/suggestions.js';

import { makePlace } from './fixtures.js';

const places = ['a', 'b', 'c', 'd'].map((id, i) =>
  makePlace({
    id,
    name: `Place ${id.toUpperCase()}`,
    category: 'park',
    description: `park ${id}`,
    lat: 43.65 + i * 0.01,
  }),
);

const trip: Parameters<typeof buildEditedResult>[0] = {
  city: 'toronto',
  travelMode: 'walking' as const,
  title: 'A Day',
  vibeTags: ['chill'],
  narrative: 'Start slow.',
  legs: [
    {
      placeId: 'a',
      name: 'Place A',
      order: 1,
      note: 'Original note A.',
      category: 'park',
      lat: 43.65,
      lng: -79.38,
    },
    {
      placeId: 'b',
      name: 'Place B',
      order: 2,
      note: 'Original note B.',
      category: 'park',
      lat: 43.66,
      lng: -79.38,
    },
    {
      placeId: 'c',
      name: 'Place C',
      order: 3,
      note: 'Original note C.',
      category: 'park',
      lat: 43.67,
      lng: -79.38,
    },
  ],
};

const deps = (over: Partial<EditDeps> = {}): EditDeps => ({
  getPlaces: vi.fn(async (ids: string[]) => places.filter((p) => ids.includes(p.id))),
  route: vi.fn(async () => ({
    geojson: { type: 'LineString' as const, coordinates: [] },
    totalDistanceKm: 3.456,
  })),
  ...over,
});

describe('buildEditedResult', () => {
  it('reorders stops, renumbers them, and keeps title, tags, narrative and existing notes', async () => {
    const result = await buildEditedResult(trip, ['c', 'a', 'b'], deps());
    expect(result.legs.map((l) => [l.placeId, l.order])).toEqual([
      ['c', 1],
      ['a', 2],
      ['b', 3],
    ]);
    expect(result.legs[0]?.note).toBe('Original note C.');
    expect(result).toMatchObject({
      title: 'A Day',
      vibeTags: ['chill'],
      narrative: 'Start slow.',
      totalDistanceKm: 3.46,
    });
  });

  it('describes a newly added stop from the place data and recomputes the route for the new order', async () => {
    const d = deps();
    const result = await buildEditedResult(trip, ['a', 'b', 'c', 'd'], d);
    expect(result.legs[3]).toMatchObject({
      placeId: 'd',
      order: 4,
      note: 'Park d.',
      category: 'park',
    });
    expect(d.route).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ placeId: 'd' })]),
      'walking',
    );
  });

  it('allows itineraries with more than twelve stops', async () => {
    const manyPlaces = Array.from({ length: 14 }, (_, i) =>
      makePlace({ id: `long-${i}`, name: `Long Stop ${i}` }),
    );
    const result = await buildEditedResult(
      trip,
      manyPlaces.map((place) => place.id),
      deps({ getPlaces: async () => manyPlaces }),
    );
    expect(result.legs).toHaveLength(14);
  });

  it('supports removing a stop down to the minimum', async () => {
    const result = await buildEditedResult(trip, ['a', 'c'], deps());
    expect(result.legs.map((l) => l.placeId)).toEqual(['a', 'c']);
  });

  it('keeps the edit with a straight-line distance when routing is unavailable', async () => {
    const result = await buildEditedResult(
      trip,
      ['a', 'b'],
      deps({ route: vi.fn().mockRejectedValue(new Error('osrm down')) }),
    );
    expect(result.routeGeojson).toBeNull();
    expect(result.totalDistanceKm).toBeGreaterThan(0);
  });

  it.each([
    [['a'], /at least 2/],
    [['a', 'a', 'b'], /only appear once/],
  ])('rejects %j', async (ids, message) => {
    await expect(buildEditedResult(trip, ids, deps())).rejects.toThrow(message);
    await expect(buildEditedResult(trip, ids, deps())).rejects.toBeInstanceOf(TripEditError);
  });

  it('rejects places that do not exist or belong to another city, before touching the route', async () => {
    const d = deps();
    await expect(buildEditedResult(trip, ['a', 'ghost'], d)).rejects.toThrow(/not available/);

    const foreign = makePlace({ id: 'z', city: 'montreal' });
    const d2 = deps({ getPlaces: async () => [places[0]!, foreign] });
    await expect(buildEditedResult(trip, ['a', 'z'], d2)).rejects.toThrow(/not available/);
    expect(d.route).not.toHaveBeenCalled();
    expect(d2.route).not.toHaveBeenCalled();
  });
});

describe('suggestPlacesForTrip', () => {
  const pool = Array.from({ length: 14 }, (_, i) => makePlace({ id: `p${i}`, name: `P${i}` }));
  const suggestionDeps = (): SuggestionDeps => ({
    byName: vi.fn(async (_city, _q, limit) => pool.slice(0, limit)),
    semantic: vi.fn(async (_text, _city, limit) => pool.slice(0, limit)),
  });
  const tripWith = (ids: string[], interests: string[] = ['art']) => ({
    city: 'toronto',
    interests,
    legs: ids.map((placeId, i) => ({ placeId, name: placeId, order: i + 1, lat: 0, lng: 0 })),
  });

  it('searches by name when the person types, and never offers stops already in the trip', async () => {
    const d = suggestionDeps();
    const result = await suggestPlacesForTrip(tripWith(['p0', 'p1']), '  museum ', d);
    expect(d.byName).toHaveBeenCalledWith('toronto', 'museum', SUGGESTION_LIMIT + 2);
    expect(d.semantic).not.toHaveBeenCalled();
    expect(result.map((p) => p.id)).not.toContain('p0');
    expect(result.map((p) => p.id)).not.toContain('p1');
    expect(result).toHaveLength(SUGGESTION_LIMIT);
  });

  it('otherwise suggests matches for the trip interests', async () => {
    const d = suggestionDeps();
    await suggestPlacesForTrip(tripWith(['p0'], ['art', 'coffee']), undefined, d);
    expect(d.semantic).toHaveBeenCalledWith('art coffee', 'toronto', SUGGESTION_LIMIT + 1);
  });

  it('still suggests something for a trip with no interests', async () => {
    const d = suggestionDeps();
    await suggestPlacesForTrip(tripWith(['p0'], []), '   ', d);
    expect(d.semantic).toHaveBeenCalledWith(
      expect.stringMatching(/things to see/),
      'toronto',
      expect.any(Number),
    );
  });
});
