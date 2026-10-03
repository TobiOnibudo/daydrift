import { config } from '@daydrift/config';

// OSRM routing. Mode-aware route geometry + distance for the itinerary legs
// (docs/03 §7). The OSRM base URL comes from config (defaults to public OSRM).

export interface Coord {
  lat: number;
  lng: number;
}

export interface RouteResult {
  geojson: unknown;
  totalDistanceKm: number;
}

// `OSRM_BASE_URL` lives under config.external (optional; defaults to public OSRM).
const external = config as unknown as { external?: { osrmBaseUrl?: string } };
const OSRM_BASE_URL = external.external?.osrmBaseUrl ?? 'https://router.project-osrm.org';

/** Fetch a route over the given ordered coordinates via OSRM. */
export async function fetchRoute(_coords: Coord[]): Promise<RouteResult> {
  // TODO: build the OSRM `/route/v1/{mode}/{coords}` request against
  // OSRM_BASE_URL, parse geometry (route_geojson) + distance (total_distance_km).
  void OSRM_BASE_URL;
  return { geojson: null, totalDistanceKm: 0 };
}
