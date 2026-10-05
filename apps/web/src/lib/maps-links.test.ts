import { describe, expect, it } from 'vitest';

import {
  appleRouteUrl,
  appleToStopUrl,
  googleRouteUrl,
  googleToStopUrl,
  type MapPoint,
} from './maps-links';

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

  it('gives directions to a stop from the current location, or from the previous stop', () => {
    const here = new URL(googleToStopUrl(b, 'cycling'));
    expect(here.searchParams.get('destination')).toBe('43.6536,-79.3925');
    expect(here.searchParams.has('origin')).toBe(false);
    expect(here.searchParams.get('travelmode')).toBe('bicycling');

    const leg = new URL(googleToStopUrl(b, 'walking', a));
    expect(leg.searchParams.get('origin')).toBe('43.6677,-79.3948');
  });
});

describe('Apple Maps links', () => {
  it('chains the remaining stops with +to: after the start', () => {
    const url = appleRouteUrl([a, b, c], 'walking') as string;
    expect(url).toBe(
      'https://maps.apple.com/?saddr=43.6677,-79.3948&daddr=43.6536,-79.3925+to:43.6426,-79.3871&dirflg=w',
    );
  });

  it('uses the driving flag, and leaves the mode out for cycling (unsupported)', () => {
    expect(appleRouteUrl([a, b], 'driving')).toContain('&dirflg=d');
    expect(appleRouteUrl([a, b], 'cycling')).not.toContain('dirflg');
  });

  it('has nothing to open for fewer than two stops', () => {
    expect(appleRouteUrl([a], 'walking')).toBeNull();
  });

  it('gives directions to a stop, from the current location unless a start is given', () => {
    expect(appleToStopUrl(b, 'walking')).toBe(
      'https://maps.apple.com/?daddr=43.6536,-79.3925&dirflg=w',
    );
    expect(appleToStopUrl(b, 'driving', a)).toBe(
      'https://maps.apple.com/?daddr=43.6536,-79.3925&saddr=43.6677,-79.3948&dirflg=d',
    );
  });
});
