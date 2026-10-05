import type { Place } from '@daydrift/types';

import { getRedis } from '../redis.js';

const PLACE_POOL_TTL_SECONDS = 10 * 60;

const key = (city: string) => `places:city:${city.trim().toLowerCase()}`;

/** Cached candidate pool for a city (no embeddings). Returns null on a miss. */
export async function getCityPlacePool(city: string): Promise<Place[] | null> {
  const raw = await getRedis().get(key(city));
  if (!raw) return null;
  return (JSON.parse(raw) as Array<Place & { createdAt: string }>).map((p) => ({
    ...p,
    createdAt: new Date(p.createdAt),
  }));
}

export async function setCityPlacePool(city: string, pool: Place[]): Promise<void> {
  await getRedis().set(key(city), JSON.stringify(pool), 'EX', PLACE_POOL_TTL_SECONDS);
}

/** Call after re-seeding a city so retrieval never serves a stale pool. */
export async function invalidateCityPlacePool(city: string): Promise<void> {
  await getRedis().del(key(city));
}
