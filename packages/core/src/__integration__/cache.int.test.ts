import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { makePlace } from '../__tests__/fixtures.js';
import { closeRedis, getRedis } from '../redis.js';
import { getCityPlacePool, invalidateCityPlacePool, setCityPlacePool } from '../retrieval/cache.js';
import { cacheTripResult, getCachedTripResult } from '../trip-cache.js';

import { resetState } from './helpers.js';

const result = {
  title: 'A Day',
  legs: [],
  routeGeojson: null,
  totalDistanceKm: 2,
  vibeTags: ['chill'],
};

beforeEach(resetState);
afterAll(closeRedis);

describe('caches (real Redis)', () => {
  it('round-trips a trip result under trip:result:<hash> with a TTL', async () => {
    expect(await getCachedTripResult('abc')).toBeNull();

    await cacheTripResult('abc', result);

    expect(await getCachedTripResult('abc')).toEqual(result);
    const ttl = await getRedis().ttl('trip:result:abc');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(6 * 60 * 60);
  });

  it('treats a corrupt entry as a miss', async () => {
    await getRedis().set('trip:result:bad', '{nope');
    expect(await getCachedTripResult('bad')).toBeNull();
  });

  it('caches the city pool, revives dates, and invalidates on demand', async () => {
    const pool = [makePlace({ id: 'a' }), makePlace({ id: 'b' })];
    await setCityPlacePool('Toronto', pool);

    const cached = await getCityPlacePool(' toronto ');
    expect(cached?.map((p) => p.id)).toEqual(['a', 'b']);
    expect(cached?.[0]?.createdAt).toBeInstanceOf(Date);
    expect(await getRedis().ttl('places:city:toronto')).toBeGreaterThan(0);

    await invalidateCityPlacePool('TORONTO');
    expect(await getCityPlacePool('toronto')).toBeNull();
  });
});
