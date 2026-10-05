import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, { value: string; ttl?: number }>();

vi.mock('../redis.js', () => ({
  getRedis: () => ({
    get: async (k: string) => store.get(k)?.value ?? null,
    set: async (k: string, value: string, _mode?: string, ttl?: number) => {
      store.set(k, { value, ttl });
      return 'OK';
    },
  }),
}));

const { cacheTripResult, getCachedTripResult } = await import('../trip-cache.js');

const result = {
  title: 'A Day',
  legs: [
    {
      placeId: '7d4b8a3e-7c43-4f6f-9d1b-1f2b7a9c0e11',
      name: 'Spot',
      order: 1,
      lat: 43.65,
      lng: -79.38,
    },
  ],
  routeGeojson: null,
  totalDistanceKm: 1.2,
  vibeTags: ['chill'],
};

beforeEach(() => store.clear());

describe('trip result cache', () => {
  it('misses when nothing is cached', async () => {
    expect(await getCachedTripResult('abc')).toBeNull();
  });

  it('round-trips a result under trip:result:<hash> with a TTL', async () => {
    await cacheTripResult('abc', result);
    expect(store.get('trip:result:abc')?.ttl).toBeGreaterThan(0);
    expect(await getCachedTripResult('abc')).toEqual(result);
  });

  it('treats corrupt or schema-invalid entries as misses', async () => {
    store.set('trip:result:bad', { value: '{not json' });
    store.set('trip:result:old', { value: JSON.stringify({ title: 1 }) });
    expect(await getCachedTripResult('bad')).toBeNull();
    expect(await getCachedTripResult('old')).toBeNull();
  });
});
