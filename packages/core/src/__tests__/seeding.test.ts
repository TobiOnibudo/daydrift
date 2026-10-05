import { describe, expect, it } from 'vitest';

import {
  capByCategory,
  mapOverpassToPlace,
  placeEmbeddingText,
  type PlaceInsert,
} from '../seeding/mapping.js';
import {
  buildOverpassQuery,
  parseOverpassResponse,
  type OverpassPlace,
} from '../seeding/overpass.js';

const osm = (tags: Record<string, string>, id = 1): OverpassPlace => ({
  id,
  lat: 43.65,
  lon: -79.38,
  type: 'node',
  tags,
});

describe('mapOverpassToPlace', () => {
  it.each([
    [{ amenity: 'cafe' }, 'cafe'],
    [{ amenity: 'pub' }, 'restaurant'],
    [{ amenity: 'theatre' }, 'theatre'],
    [{ amenity: 'marketplace' }, 'market'],
    [{ tourism: 'museum' }, 'museum'],
    [{ tourism: 'gallery' }, 'gallery'],
    [{ tourism: 'viewpoint' }, 'viewpoint'],
    [{ tourism: 'attraction' }, 'landmark'],
    [{ leisure: 'park' }, 'park'],
    [{ historic: 'monument' }, 'landmark'],
  ])('maps %j to %s', (tags, category) => {
    expect(mapOverpassToPlace(osm({ name: 'X', ...tags }), 'Toronto')?.category).toBe(category);
  });

  it('skips unnamed and unmapped places', () => {
    expect(mapOverpassToPlace(osm({ amenity: 'cafe' }), 'Toronto')).toBeNull();
    expect(mapOverpassToPlace(osm({ name: 'X', shop: 'bakery' }), 'Toronto')).toBeNull();
  });

  it('builds a namespaced osmId, lowercases the city and synthesizes a description', () => {
    const place = mapOverpassToPlace(
      osm({ name: 'Pizzeria', amenity: 'restaurant', cuisine: 'pizza;italian' }, 42),
      ' Toronto ',
    );
    expect(place).toMatchObject({
      osmId: 'node/42',
      city: 'toronto',
      lat: 43.65,
      lng: -79.38,
      description: 'pizza, italian restaurant',
    });
  });

  it('prefers an explicit OSM description', () => {
    const place = mapOverpassToPlace(
      osm({ name: 'Park', leisure: 'park', description: 'Big green space' }),
      'Toronto',
    );
    expect(place?.description).toBe('Big green space');
  });
});

describe('capByCategory', () => {
  const make = (id: number, category: PlaceInsert['category'], tags = {}): PlaceInsert => ({
    osmId: `node/${id}`,
    name: `P${id}`,
    city: 'toronto',
    category,
    description: null,
    lat: 0,
    lng: 0,
    tags,
  });

  it('keeps the best-documented places up to the cap and dedupes by osmId', () => {
    const result = capByCategory(
      [
        make(1, 'cafe'),
        make(2, 'cafe', { website: 'x', wikidata: 'Q1' }),
        make(3, 'cafe'),
        make(1, 'cafe'),
      ],
      { cafe: 2 },
    );
    expect(result).toHaveLength(2);
    expect(result[0]?.osmId).toBe('node/2');
  });

  it('does not cap categories without a limit', () => {
    const many = Array.from({ length: 100 }, (_, i) => make(i, 'museum'));
    expect(capByCategory(many, { cafe: 1 })).toHaveLength(100);
  });
});

describe('placeEmbeddingText', () => {
  it('joins distinct, meaningful signals', () => {
    const text = placeEmbeddingText({
      name: 'Royal Ontario Museum',
      category: 'museum',
      description: 'museum',
      tags: { tourism: 'museum', cuisine: undefined },
    });
    expect(text).toBe('Royal Ontario Museum. museum');
  });
});

describe('overpass helpers', () => {
  it('builds a query bounded by S,W,N,E', () => {
    const q = buildOverpassQuery({ south: 1, west: 2, north: 3, east: 4 });
    expect(q).toContain('(1,2,3,4)');
    expect(q).toContain('out center tags;');
  });

  it('uses center coords for ways and drops untagged or coordless elements', () => {
    const parsed = parseOverpassResponse({
      elements: [
        { type: 'way', id: 1, center: { lat: 1, lon: 2 }, tags: { name: 'A' } },
        { type: 'node', id: 2, lat: 3, lon: 4 },
        { type: 'node', id: 3, tags: { name: 'B' } },
      ],
    });
    expect(parsed).toEqual([{ id: 1, lat: 1, lon: 2, tags: { name: 'A' }, type: 'way' }]);
  });
});
