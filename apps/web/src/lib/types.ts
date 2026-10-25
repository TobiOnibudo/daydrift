import type { Place as PlaceModel, Trip as TripModel } from '@daydrift/types';

// IMPORTANT: import only *types* from @daydrift/types. Its runtime pulls in Node-only config.

export type { TripLeg, TripStatus } from '@daydrift/types';

/** JSON has no Date: timestamps arrive as ISO strings. */
export type ApiTrip = Omit<TripModel, 'createdAt'> & { createdAt: string };

/** What a public share link exposes: no owner, no token. */
export type SharedApiTrip = Omit<ApiTrip, 'userId' | 'shareToken'>;

export type ApiPlace = Omit<PlaceModel, 'createdAt'> & { createdAt: string };

export interface CitySummary {
  key: string;
  name: string;
  placeCount: number;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export type Duration = '2h' | 'half-day' | 'full-day';
export type TravelMode = 'walking' | 'cycling' | 'driving';

export interface CreateTripPayload {
  city: string;
  interests: string[];
  duration: Duration;
  travelMode: TravelMode;
  stopCount: number;
  locationPreference: string;
}

export type TripStep = 'retrieving' | 'generating' | 'routing';

/** Events the API relays over SSE (docs/04 §5). */
export type TripEvent =
  | { event: 'status'; data: { step: TripStep; label: string } }
  | { event: 'token'; data: { text: string } }
  | { event: 'complete'; data: { trip: ApiTrip } }
  | { event: 'failed'; data: { message: string } };
