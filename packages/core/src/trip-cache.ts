import { TripResultSchema, type TripResult } from '@daydrift/types';

import { getRedis } from './redis.js';

const TRIP_RESULT_TTL_SECONDS = 6 * 60 * 60;

const key = (hash: string) => `trip:result:${hash}`;

/** Exact-key result cache (docs/03 §2). Corrupt or outdated entries are treated as misses. */
export async function getCachedTripResult(hash: string): Promise<TripResult | null> {
  const raw = await getRedis().get(key(hash));
  if (!raw) return null;
  try {
    const parsed = TripResultSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function cacheTripResult(hash: string, result: TripResult): Promise<void> {
  await getRedis().set(key(hash), JSON.stringify(result), 'EX', TRIP_RESULT_TTL_SECONDS);
}
