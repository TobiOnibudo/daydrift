import { describe, expect, it } from 'vitest';

import { pathThrough, routeThumbPoints } from './route-thumb';

describe('routeThumbPoints', () => {
  it('returns nothing for no stops and the centre for a single stop', () => {
    expect(routeThumbPoints([], 100, 60)).toEqual([]);
    expect(routeThumbPoints([{ lat: 43.65, lng: -79.38 }], 100, 60)).toEqual([[50, 30]]);
  });

  it('keeps every point inside the padded canvas', () => {
    const stops = [
      { lat: 43.6, lng: -79.5 },
      { lat: 43.7, lng: -79.3 },
      { lat: 43.65, lng: -79.4 },
    ];
    for (const [x, y] of routeThumbPoints(stops, 100, 60, 10)) {
      expect(x).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(x).toBeLessThanOrEqual(90 + 1e-9);
      expect(y).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(y).toBeLessThanOrEqual(50 + 1e-9);
    }
  });

  it('draws north at the top and east on the right', () => {
    const [south, north] = routeThumbPoints(
      [
        { lat: 43.6, lng: -79.4 },
        { lat: 43.7, lng: -79.4 },
      ],
      100,
      100,
    );
    expect((north as number[])[1]).toBeLessThan((south as number[])[1] as number);

    const [west, east] = routeThumbPoints(
      [
        { lat: 43.65, lng: -79.5 },
        { lat: 43.65, lng: -79.3 },
      ],
      100,
      100,
    );
    expect((east as number[])[0]).toBeGreaterThan((west as number[])[0] as number);
  });

  it('preserves proportions: a wide route stays wide instead of being stretched to fill', () => {
    const [a, b] = routeThumbPoints(
      [
        { lat: 43.65, lng: -79.5 },
        { lat: 43.66, lng: -79.3 },
      ],
      200,
      100,
    ) as Array<[number, number]>;
    const dx = Math.abs(b[0] - a[0]);
    const dy = Math.abs(b[1] - a[1]);
    expect(dx).toBeGreaterThan(dy * 5);
  });

  it('centres the shape on the shorter axis', () => {
    const pts = routeThumbPoints(
      [
        { lat: 43.65, lng: -79.5 },
        { lat: 43.65, lng: -79.3 },
      ],
      200,
      100,
    );
    expect(pts.every(([, y]) => Math.abs(y - 50) < 1e-9)).toBe(true);
  });
});

describe('pathThrough', () => {
  it('builds a polyline path', () => {
    expect(
      pathThrough([
        [1, 2],
        [3.14159, 4],
      ]),
    ).toBe('M 1.0 2.0 L 3.1 4.0');
    expect(pathThrough([])).toBe('');
  });
});
