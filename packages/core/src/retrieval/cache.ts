import { config } from '@daydrift/config';
import type { Place } from '@daydrift/types';
import { Redis } from 'ioredis';

const redis = new Redis(config.redis.url);

const PLACE_POOL_TTL = 600; // 10 minutes

export async function getCityPlacePool(city: string): Promise<Place[] | null> {
  const key = `places:city:${city.toLowerCase()}`;
  const cached = await redis.get(key);

  if (!cached) return null;

  return JSON.parse(cached) as Place[];
}

export async function setCityPlacePool(city: string, places: Place[]): Promise<void> {
  const key = `places:city:${city.toLowerCase()}`;
  await redis.setex(key, PLACE_POOL_TTL, JSON.stringify(places));
}
