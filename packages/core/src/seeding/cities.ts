import type { CityDefinition } from './seed-city.js';

/** Cities Daydrift can seed. Bounding boxes are (south, west, north, east) in degrees. */
export const CITIES: Record<string, CityDefinition> = {
  toronto: {
    name: 'Toronto',
    bbox: { south: 43.62, west: -79.43, north: 43.7, east: -79.34 },
  },
  halifax: {
    name: 'Halifax',
    bbox: { south: 44.62, west: -63.65, north: 44.7, east: -63.52 },
  },
  montreal: {
    name: 'Montreal',
    bbox: { south: 45.47, west: -73.65, north: 45.56, east: -73.52 },
  },
  vancouver: {
    name: 'Vancouver',
    bbox: { south: 49.24, west: -123.16, north: 49.31, east: -123.04 },
  },
};

export function findCity(name: string): CityDefinition | undefined {
  return CITIES[name.trim().toLowerCase()];
}
