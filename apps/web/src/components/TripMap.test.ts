import { describe, expect, it } from 'vitest';

import { toLatLngs } from './TripMap';

describe('toLatLngs', () => {
  it('converts GeoJSON [lng, lat] pairs to Leaflet [lat, lng]', () => {
    const line: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [-79.38, 43.65],
        [-79.4, 43.7],
      ],
    };
    expect(toLatLngs(line)).toEqual([
      [43.65, -79.38],
      [43.7, -79.4],
    ]);
  });
});
