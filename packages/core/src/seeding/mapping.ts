import type { PlaceCategory } from '@daydrift/types';

import type { OverpassPlace } from './overpass.js';

export interface PlaceInsert {
  osmId: string;
  name: string;
  city: string;
  category: PlaceCategory;
  description: string | null;
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

function inferCategory(tags: Record<string, string>): PlaceCategory | null {
  switch (tags.amenity) {
    case 'cafe':
      return 'cafe';
    case 'restaurant':
    case 'pub':
    case 'bar':
      return 'restaurant';
    case 'theatre':
    case 'cinema':
    case 'arts_centre':
      return 'theatre';
    case 'marketplace':
      return 'market';
  }
  switch (tags.tourism) {
    case 'museum':
      return 'museum';
    case 'gallery':
      return 'gallery';
    case 'viewpoint':
      return 'viewpoint';
    case 'attraction':
    case 'zoo':
    case 'aquarium':
      return 'landmark';
  }
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'park';
  if (tags.historic) return 'landmark';
  return null;
}

const humanize = (s: string) => s.replace(/_/g, ' ');

/** Prefer the OSM description; otherwise synthesize a short label like "pizza restaurant". */
function describe(tags: Record<string, string>): string {
  if (tags['description:en'] ?? tags.description)
    return (tags['description:en'] ?? tags.description) as string;
  const kind = tags.amenity ?? tags.tourism ?? tags.leisure ?? tags.historic ?? '';
  const cuisine = tags.cuisine ? `${humanize(tags.cuisine).replace(/;/g, ', ')} ` : '';
  return `${cuisine}${kind === 'yes' ? 'historic site' : humanize(kind)}`.trim();
}

export function mapOverpassToPlace(osm: OverpassPlace, cityName: string): PlaceInsert | null {
  const name = osm.tags['name:en'] ?? osm.tags.name;
  if (!name) return null;

  const category = inferCategory(osm.tags);
  if (!category) return null;

  return {
    osmId: `${osm.type}/${osm.id}`,
    name,
    city: cityName.trim().toLowerCase(),
    category,
    description: describe(osm.tags) || null,
    lat: osm.lat,
    lng: osm.lon,
    tags: osm.tags,
  };
}

const RICH_TAGS = [
  'wikipedia',
  'wikidata',
  'website',
  'contact:website',
  'description',
  'opening_hours',
];

const richness = (p: PlaceInsert) => RICH_TAGS.filter((k) => p.tags[k]).length;

export const DEFAULT_CATEGORY_CAPS: Partial<Record<PlaceCategory, number>> = {
  restaurant: 40,
  cafe: 30,
};

/** Dedupe by osmId, then keep the best-documented places per capped category. */
export function capByCategory(
  places: PlaceInsert[],
  caps: Partial<Record<PlaceCategory, number>> = DEFAULT_CATEGORY_CAPS,
): PlaceInsert[] {
  const unique = [...new Map(places.map((p) => [p.osmId, p])).values()];
  const ranked = unique.sort((a, b) => richness(b) - richness(a));

  const counts = new Map<PlaceCategory, number>();
  return ranked.filter((p) => {
    const cap = caps[p.category];
    const n = counts.get(p.category) ?? 0;
    if (cap !== undefined && n >= cap) return false;
    counts.set(p.category, n + 1);
    return true;
  });
}

/** The text that gets embedded: name plus the signals a traveler would search by. */
export function placeEmbeddingText(p: {
  name: string;
  category: string;
  description: string | null;
  tags: unknown;
}): string {
  const tags = (p.tags ?? {}) as Record<string, string>;
  const parts = [p.name, p.category, p.description, tags.cuisine, tags.historic, tags.tourism];
  return [...new Set(parts.filter((s): s is string => Boolean(s && s !== 'yes')))]
    .map(humanize)
    .join('. ');
}
