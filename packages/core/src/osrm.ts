import { config } from '@daydrift/config';
import type { TravelMode } from '@daydrift/types';

// OSRM routing: mode-aware route geometry + distance for the itinerary legs (docs/03 §7).

export interface Coord {
  lat: number;
  lng: number;
}

export interface RouteResult {
  geojson: GeoJSON.LineString | null;
  totalDistanceKm: number;
}

// routing.openstreetmap.de serves one OSRM instance per profile under these prefixes.
const MODE_PATH: Record<TravelMode, string> = {
  walking: 'routed-foot',
  cycling: 'routed-bike',
  driving: 'routed-car',
};

interface OsrmResponse {
  code: string;
  routes?: Array<{ distance: number; geometry: GeoJSON.LineString }>;
}

/** Fetch a route over the ordered coordinates. Returns an empty route for fewer than 2 points. */
export async function fetchRoute(
  coords: Coord[],
  mode: TravelMode = 'walking',
): Promise<RouteResult> {
  if (coords.length < 2) return { geojson: null, totalDistanceKm: 0 };

  const path = coords.map((c) => `${c.lng},${c.lat}`).join(';');
  const url = `${config.external.osrmBaseUrl}/${MODE_PATH[mode]}/route/v1/driving/${path}?overview=full&geometries=geojson`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`OSRM request failed: ${res.status} ${res.statusText}`);

  const body = (await res.json()) as OsrmResponse;
  const route = body.routes?.[0];
  if (body.code !== 'Ok' || !route) throw new Error(`OSRM returned no route (code: ${body.code})`);

  return { geojson: route.geometry, totalDistanceKm: route.distance / 1000 };
}
