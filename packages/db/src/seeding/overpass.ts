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
    type: string;
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }>;
}

export async function fetchPlacesFromOverpass(
  bbox: BoundingBox,
): Promise<OverpassPlace[]> {
  const query = `
    [out:json][timeout:60];
    (
      node["tourism"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["amenity"~"restaurant|cafe|bar|pub|fast_food|food_court|ice_cream|biergarten"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["leisure"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["historic"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["shop"~"mall|department_store|books|art|music|gift"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["tourism"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["amenity"~"restaurant|cafe|bar|pub|fast_food|food_court"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["leisure"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["historic"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    out center;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.statusText}`);
  }

  const data = (await response.json()) as OverpassResponse;

  return data.elements
    .filter((el) => el.tags)
    .map((el) => ({
      id: el.id,
      lat: el.lat ?? el.center?.lat ?? 0,
      lon: el.lon ?? el.center?.lon ?? 0,
      tags: el.tags ?? {},
      type: el.type as 'node' | 'way' | 'relation',
    }))
    .filter((el) => el.lat !== 0 && el.lon !== 0);
}
