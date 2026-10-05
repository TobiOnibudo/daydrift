import { createHash } from 'node:crypto';

import type { CreateTripInput } from '@daydrift/types';

export type NormalizedInput = CreateTripInput;

/** Canonical form so logically identical requests share a cache key (docs/03 §1). */
export function normalizeInput(input: CreateTripInput): NormalizedInput {
  return {
    city: input.city.trim().toLowerCase(),
    interests: [
      ...new Set(input.interests.map((s) => s.trim().toLowerCase()).filter(Boolean)),
    ].sort(),
    duration: input.duration,
    travelMode: input.travelMode,
  };
}

/** Stable SHA-256 of the normalized input; stored on trips.input_hash and used as the cache key. */
export function hashInput(input: CreateTripInput): string {
  const n = normalizeInput(input);
  return createHash('sha256')
    .update(JSON.stringify([n.city, n.interests, n.duration, n.travelMode]))
    .digest('hex');
}
