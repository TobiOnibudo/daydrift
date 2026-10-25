import { describe, expect, it } from 'vitest';

import { googleRouteUrl, googleToStopUrl, type MapPoint } from './maps-links';

const a: MapPoint = { lat: 43.6677, lng: -79.3948 };
const b: MapPoint = { lat: 43.6536, lng: -79.3925 };
const c: MapPoint = { lat: 43.6426, lng: -79.3871 };

describe('Google Maps links', () => {
  it('opens the whole route with middle stops as waypoints, in order', () => {
    const url = new URL(googleRouteUrl([a, b, c], 'walking') as string);
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('origin')).toBe('43.6677,-79.3948');
    expect(url.searchParams.get('destination')).toBe('43.6426,-79.3871');
    expect(url.searchParams.get('waypoints')).toBe('43.6536,-79.3925');
    expect(url.searchParams.get('travelmode')).toBe('walking');
  });

  it('separates several waypoints with a pipe and omits the parameter for two stops', () => {
    const many = new URL(googleRouteUrl([a, b, c, a], 'driving') as string);
    expect(many.searchParams.get('waypoints')).toBe('43.6536,-79.3925|43.6426,-79.3871');
    expect(new URL(googleRouteUrl([a, c], 'driving') as string).searchParams.has('waypoints')).toBe(
      false,
    );
  });

  it('maps travel modes to Google names', () => {
    const mode = (m: 'walking' | 'cycling' | 'driving') =>
      new URL(googleRouteUrl([a, b], m) as string).searchParams.get('travelmode');
    expect([mode('walking'), mode('cycling'), mode('driving')]).toEqual([
      'walking',
      'bicycling',
      'driving',
    ]);
  });

  it('never exceeds the 9 waypoint limit', () => {
    const stops = Array.from({ length: 14 }, (_, i) => ({ lat: 43 + i / 100, lng: -79 }));
    const url = new URL(googleRouteUrl(stops, 'walking') as string);
    expect(url.searchParams.get('waypoints')?.split('|')).toHaveLength(9);
  });

  it('has nothing to open for fewer than two stops', () => {
    expect(googleRouteUrl([], 'walking')).toBeNull();
    expect(googleRouteUrl([a], 'walking')).toBeNull();
  });

  it("gives directions from the traveler's current location to a stop", () => {
    const here = new URL(googleToStopUrl(b, 'cycling'));
    expect(here.searchParams.get('destination')).toBe('43.6536,-79.3925');
    expect(here.searchParams.has('origin')).toBe(false);
    expect(here.searchParams.get('travelmode')).toBe('bicycling');

    const laterStop = new URL(googleToStopUrl(c, 'walking'));
    expect(laterStop.searchParams.get('destination')).toBe('43.6426,-79.3871');
    expect(laterStop.searchParams.has('origin')).toBe(false);
  });
});
