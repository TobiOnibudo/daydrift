import type { Place, TripLeg } from '@daydrift/types';

// Itinerary post-processing + fallback construction. See docs/03 §7 and §9.

/**
 * Normalize model-produced legs against the candidate list (docs/03 §7):
 * drop hallucinated placeIds, dedupe, and pad to `minStops` from candidates.
 */
export function normalizeItineraryLegs(
  _legs: TripLeg[],
  _candidates: Place[],
  _minStops: number,
): TripLeg[] {
  // TODO: validate placeIds, dedupe, pad to minStops, enrich coords in-memory.
  return [];
}

/**
 * Build an in-process fallback itinerary when LLM generation fails
 * (docs/03 §9): greedy nearest-neighbor over candidate coords, respecting
 * the duration-derived stop range — persisted before any `failed` status.
 */
export function buildFallbackItinerary(
  _candidates: Place[],
  _minStops: number,
  _maxStops: number,
): TripLeg[] {
  // TODO: proximity-ordered greedy selection from the candidate pool.
  return [];
}
