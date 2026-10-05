import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchRoute } from '../osrm.js';

const coords = [
  { lat: 43.6532, lng: -79.3832 },
  { lat: 43.6426, lng: -79.3871 },
];

afterEach(() => vi.unstubAllGlobals());

describe('fetchRoute', () => {
  it('requests lng,lat pairs on the mode-specific profile and parses the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 'Ok',
        routes: [
          { distance: 1701.6, geometry: { type: 'LineString', coordinates: [[-79.38, 43.65]] } },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const route = await fetchRoute(coords, 'cycling');

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('/routed-bike/route/v1/driving/-79.3832,43.6532;-79.3871,43.6426');
    expect(route.totalDistanceKm).toBeCloseTo(1.7016, 4);
    expect(route.geojson?.type).toBe('LineString');
  });

  it('returns an empty route without calling the network for <2 points', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchRoute(coords.slice(0, 1))).toEqual({ geojson: null, totalDistanceKm: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws on HTTP errors and on non-Ok OSRM codes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'boom' }),
    );
    await expect(fetchRoute(coords)).rejects.toThrow('OSRM request failed');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 'NoRoute' }) }),
    );
    await expect(fetchRoute(coords)).rejects.toThrow('no route');
  });
});
