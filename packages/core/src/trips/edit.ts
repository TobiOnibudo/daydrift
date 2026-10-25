import type { Place, Trip, TripLeg, TripResult, TravelMode } from '@daydrift/types';

import { placeBlurb } from '../blurb.js';
import { pathDistanceKm } from '../itinerary.js';
import { fetchRoute, type RouteResult } from '../osrm.js';
import { getPlacesByIds } from '../places/repository.js';

export const MIN_STOPS = 2;
export const MAX_STOPS = 12;

/** The request can't be applied; the message is safe to show to the person who made it. */
export class TripEditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TripEditError';
  }
}

export interface EditDeps {
  getPlaces: (ids: string[]) => Promise<Place[]>;
  route: (legs: TripLeg[], mode: TravelMode) => Promise<RouteResult>;
}

const defaultDeps: EditDeps = { getPlaces: getPlacesByIds, route: fetchRoute };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Rebuild a trip's itinerary from an ordered list of place ids (the person added, removed, swapped,
 * or reordered stops). Places must exist and belong to the trip's city, so a request can never put
 * an arbitrary or foreign stop into someone's day. Stops that were already in the trip keep their
 * descriptions; new ones get one from the place data. The route is recomputed, degrading to a
 * straight-line distance if routing is unavailable.
 */
export async function buildEditedResult(
  trip: Pick<Trip, 'city' | 'travelMode' | 'legs' | 'title' | 'vibeTags' | 'narrative'>,
  placeIds: string[],
  deps: EditDeps = defaultDeps,
): Promise<TripResult> {
  if (placeIds.length < MIN_STOPS) {
    throw new TripEditError(`A trip needs at least ${MIN_STOPS} stops.`);
  }
  if (placeIds.length > MAX_STOPS) {
    throw new TripEditError(`A trip can have at most ${MAX_STOPS} stops.`);
  }
  if (new Set(placeIds).size !== placeIds.length) {
    throw new TripEditError('Each stop can only appear once.');
  }

  const places = new Map((await deps.getPlaces(placeIds)).map((p) => [p.id, p]));
  const previous = new Map(trip.legs.map((l) => [l.placeId, l]));

  const legs: TripLeg[] = placeIds.map((id, index) => {
    const place = places.get(id);
    if (!place || place.city !== trip.city) {
      throw new TripEditError('One of those places is not available for this trip.');
    }
    const existing = previous.get(id);
    return {
      placeId: place.id,
      name: place.name,
      order: index + 1,
      note: existing?.note ?? placeBlurb(place),
      category: place.category,
      lat: place.lat,
      lng: place.lng,
    };
  });

  let routeGeojson: unknown = null;
  let km = pathDistanceKm(legs);
  try {
    const route = await deps.route(legs, trip.travelMode);
    routeGeojson = route.geojson;
    km = route.totalDistanceKm;
  } catch {
    // Routing is a nicety: keep the edit, with a straight-line distance and no road geometry.
  }

  return {
    title: trip.title ?? 'Your trip',
    legs,
    routeGeojson,
    totalDistanceKm: round2(km),
    vibeTags: trip.vibeTags,
    ...(trip.narrative ? { narrative: trip.narrative } : {}),
  };
}
