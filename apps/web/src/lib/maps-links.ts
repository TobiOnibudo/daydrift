import type { TravelMode } from './types';

// Deep links that hand a trip to the maps app people actually navigate with. They are plain URLs,
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

// Apple's URL scheme has walking and driving flags only; cycling opens with the app's default.
const APPLE_MODE: Partial<Record<TravelMode, string>> = { walking: 'w', driving: 'd' };

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

/**
 * Directions to one stop. Without `from`, the maps app starts from the device's current location,
 * which is what someone standing somewhere in the city wants.
 */
export function googleToStopUrl(stop: MapPoint, mode: TravelMode, from?: MapPoint): string {
  const params = new URLSearchParams({
    api: '1',
    destination: coord(stop),
    travelmode: GOOGLE_MODE[mode],
  });
  if (from) params.set('origin', coord(from));
  return `https://www.google.com/maps/dir/?${params}`;
}

/** Apple Maps chains stops with "+to:" in the destination. */
export function appleRouteUrl(stops: MapPoint[], mode: TravelMode): string | null {
  const first = stops[0];
  if (!first || stops.length < 2) return null;
  const flag = APPLE_MODE[mode];
  return (
    `https://maps.apple.com/?saddr=${coord(first)}` +
    `&daddr=${stops.slice(1).map(coord).join('+to:')}` +
    (flag ? `&dirflg=${flag}` : '')
  );
}

export function appleToStopUrl(stop: MapPoint, mode: TravelMode, from?: MapPoint): string {
  const flag = APPLE_MODE[mode];
  return (
    `https://maps.apple.com/?daddr=${coord(stop)}` +
    (from ? `&saddr=${coord(from)}` : '') +
    (flag ? `&dirflg=${flag}` : '')
  );
}
