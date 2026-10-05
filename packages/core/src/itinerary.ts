import type { Place, TripLeg } from '@daydrift/types';

// Itinerary post-processing + fallback construction. See docs/03 §7 and §9.

/** A leg as produced by the model: references a candidate by id. */
export interface ModelLeg {
  placeId: string;
  order: number;
  rationale?: string;
}

const toLeg = (place: Place, order: number, note?: string): TripLeg => ({
  placeId: place.id,
  name: place.name,
  order,
  ...(note ? { note } : {}),
  lat: place.lat,
  lng: place.lng,
});

/**
 * Normalize model-produced legs against the candidate list (docs/03 §7):
 * drop hallucinated placeIds, dedupe, pad to `minStops` from candidates,
 * cap at `maxStops`, and renumber `order` from 1. Coords come from the
 * in-memory candidates (no DB call).
 */
export function normalizeItineraryLegs(
  legs: ModelLeg[],
  candidates: Place[],
  minStops: number,
  maxStops = Number.POSITIVE_INFINITY,
): TripLeg[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const used = new Set<string>();
  const result: TripLeg[] = [];

  const ordered = [...legs].sort((a, b) => a.order - b.order);
  for (const leg of ordered) {
    const place = byId.get(leg.placeId);
    if (!place || used.has(place.id) || result.length >= maxStops) continue;
    used.add(place.id);
    result.push(toLeg(place, result.length + 1, leg.rationale));
  }

  for (const place of candidates) {
    if (result.length >= minStops) break;
    if (used.has(place.id)) continue;
    used.add(place.id);
    result.push(toLeg(place, result.length + 1));
  }

  return result;
}

function distanceKm(a: Place, b: Place): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Fallback itinerary when LLM generation fails (docs/03 §9): starting from the
 * top-ranked candidate, greedily visit the nearest unvisited one. Produces
 * `maxStops` stops (or every candidate if fewer); throws if below `minStops`.
 */
export function buildFallbackItinerary(
  candidates: Place[],
  minStops: number,
  maxStops: number,
): TripLeg[] {
  const first = candidates[0];
  if (!first || candidates.length < minStops) {
    throw new Error(`Not enough candidates for fallback itinerary (need ${minStops})`);
  }

  const remaining = candidates.slice(1);
  const route: Place[] = [first];

  while (route.length < maxStops && remaining.length > 0) {
    const last = route[route.length - 1] as Place;
    let nearestIdx = 0;
    let nearestDist = Number.POSITIVE_INFINITY;
    remaining.forEach((p, i) => {
      const d = distanceKm(last, p);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    });
    route.push(remaining.splice(nearestIdx, 1)[0] as Place);
  }

  return route.map((p, i) => toLeg(p, i + 1));
}
