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

export function mapOverpassToPlace(
  osm: OverpassPlace,
  cityName: string,
): PlaceInsert | null {
  const name = osm.tags.name || osm.tags['name:en'];
  if (!name) return null; // Skip unnamed places

  const category = inferCategory(osm.tags);
  if (!category) return null;

  const description =
    osm.tags.description ||
    osm.tags['description:en'] ||
    osm.tags.amenity ||
    osm.tags.tourism ||
    osm.tags.leisure ||
    null;

  return {
    osmId: `${osm.type}/${osm.id}`,
    name,
    city: cityName.toLowerCase(),
    category,
    description,
    lat: osm.lat,
    lng: osm.lon,
    tags: osm.tags,
  };
}

function inferCategory(tags: Record<string, string>): PlaceCategory | null {
  // Restaurant/Food
  if (
    tags.amenity === 'restaurant' ||
    tags.amenity === 'cafe' ||
    tags.amenity === 'bar' ||
    tags.amenity === 'pub' ||
    tags.amenity === 'fast_food' ||
    tags.amenity === 'food_court' ||
    tags.amenity === 'ice_cream' ||
    tags.amenity === 'biergarten'
  ) {
    return tags.amenity === 'cafe' ? 'cafe' : 'restaurant';
  }

  // Tourism
  if (tags.tourism === 'museum') return 'museum';
  if (tags.tourism === 'gallery' || tags.tourism === 'artwork') return 'museum';
  if (
    tags.tourism === 'viewpoint' ||
    tags.tourism === 'attraction' ||
    tags.tourism === 'theme_park'
  )
    return 'viewpoint';

  // Leisure/Parks
  if (
    tags.leisure === 'park' ||
    tags.leisure === 'garden' ||
    tags.leisure === 'nature_reserve'
  )
    return 'park';

  // Historic
  if (
    tags.historic === 'monument' ||
    tags.historic === 'memorial' ||
    tags.historic === 'castle' ||
    tags.historic === 'ruins' ||
    tags.historic
  )
    return 'historic';

  // Entertainment
  if (
    tags.leisure === 'stadium' ||
    tags.leisure === 'sports_centre' ||
    tags.amenity === 'cinema' ||
    tags.amenity === 'theatre' ||
    tags.amenity === 'arts_centre'
  )
    return 'entertainment';

  // Shopping
  if (
    tags.shop === 'mall' ||
    tags.shop === 'department_store' ||
    tags.shop === 'books' ||
    tags.shop === 'art' ||
    tags.shop === 'music' ||
    tags.shop === 'gift' ||
    tags.shop
  )
    return 'shop';

  return null;
}
