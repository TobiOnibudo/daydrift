export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface OverpassPlace {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  type: 'node' | 'way' | 'relation';
}

interface OverpassResponse {
  elements: Array<{
    type: 'node' | 'way' | 'relation';
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }>;
}

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/** Named points of interest only; the category mapping decides what is kept. */
export function buildOverpassQuery(bbox: BoundingBox): string {
  const box = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `[out:json][timeout:90];
(
  nwr["tourism"~"^(attraction|museum|gallery|viewpoint|zoo|aquarium)$"]["name"](${box});
  nwr["amenity"~"^(restaurant|cafe|pub|bar|theatre|cinema|arts_centre|marketplace)$"]["name"](${box});
  nwr["leisure"~"^(park|garden)$"]["name"](${box});
  nwr["historic"]["name"](${box});
);
out center tags;`;
}

export function parseOverpassResponse(data: OverpassResponse): OverpassPlace[] {
  return data.elements.flatMap((el) => {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined || !el.tags) return [];
    return [{ id: el.id, lat, lon, tags: el.tags, type: el.type }];
  });
}

export async function fetchPlacesFromOverpass(bbox: BoundingBox): Promise<OverpassPlace[]> {
  const body = `data=${encodeURIComponent(buildOverpassQuery(bbox))}`;
  let lastError: unknown;

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'daydrift-seeder/0.1 (+https://github.com/TobiOnibudo)',
        },
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`Overpass ${endpoint}: ${res.status} ${res.statusText}`);
      return parseOverpassResponse((await res.json()) as OverpassResponse);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`All Overpass endpoints failed: ${String(lastError)}`);
}
