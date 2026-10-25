import type { TravelMode } from './types';

// Deep links that hand a trip to Google Maps, where people actually navigate. They are plain URLs,
// so they open the native app on phones and the web app on desktop, with no API keys.

export interface MapPoint {
  lat: number;
  lng: number;
}

const coord = (p: MapPoint) => `${p.lat},${p.lng}`;

const GOOGLE_MODE: Record<TravelMode, string> = {
  walking: 'walking',
  cycling: 'bicycling',
  driving: 'driving',
};

// Google Maps accepts at most 9 intermediate waypoints in a URL.
const GOOGLE_MAX_WAYPOINTS = 9;

/** The whole day as one journey: first stop to last, visiting the rest in order. */
export function googleRouteUrl(stops: MapPoint[], mode: TravelMode): string | null {
  const first = stops[0];
  const last = stops.at(-1);
  if (!first || !last || stops.length < 2) return null;

  const params = new URLSearchParams({
    api: '1',
    origin: coord(first),
    destination: coord(last),
    travelmode: GOOGLE_MODE[mode],
  });
  const waypoints = stops.slice(1, -1).slice(0, GOOGLE_MAX_WAYPOINTS).map(coord);
  if (waypoints.length > 0) params.set('waypoints', waypoints.join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
}

/** Directions from the traveler's current location to one stop. */
export function googleToStopUrl(stop: MapPoint, mode: TravelMode): string {
  const params = new URLSearchParams({
    api: '1',
    destination: coord(stop),
    travelmode: GOOGLE_MODE[mode],
  });
  return `https://www.google.com/maps/dir/?${params}`;
}
