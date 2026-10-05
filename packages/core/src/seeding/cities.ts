import type { CityDefinition } from './seed-city.js';

/** Cities Daydrift can seed. Bounding boxes are (south, west, north, east) in degrees. */
export const CITIES: Record<string, CityDefinition> = {
  toronto: {
    name: 'Toronto',
    bbox: { south: 43.62, west: -79.43, north: 43.7, east: -79.34 },
  },
};

export function findCity(name: string): CityDefinition | undefined {
  return CITIES[name.trim().toLowerCase()];
}
