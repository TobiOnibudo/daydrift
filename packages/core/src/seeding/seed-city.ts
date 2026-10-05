import { db, places } from '@daydrift/db';
import { createEmbedPlaceQueue } from '@daydrift/queue';

import { mapOverpassToPlace } from './mapping.js';
import { fetchPlacesFromOverpass, type BoundingBox } from './overpass.js';

export interface CityDefinition {
  name: string;
  bbox: BoundingBox;
}

export async function seedCity(city: CityDefinition): Promise<number> {
  console.log(`[seed] Fetching places for ${city.name} from Overpass...`);

  const osmPlaces = await fetchPlacesFromOverpass(city.bbox);
  console.log(`[seed] Fetched ${osmPlaces.length} places from Overpass`);

  const mappedPlaces = osmPlaces
    .map((osm) => mapOverpassToPlace(osm, city.name))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  console.log(`[seed] Mapped ${mappedPlaces.length} valid places`);

  if (mappedPlaces.length === 0) {
    console.warn('[seed] No valid places to insert');
    return 0;
  }

  // Insert places (Drizzle handles conflict on unique osmId+city)
  const inserted = await db
    .insert(places)
    .values(mappedPlaces)
    .onConflictDoNothing({ target: [places.osmId, places.city] })
    .returning({ id: places.id, name: places.name });

  console.log(`[seed] Inserted ${inserted.length} new places`);

  // Enqueue embedding jobs
  const queue = createEmbedPlaceQueue();
  for (const place of inserted) {
    const matchingPlace = mappedPlaces.find((p) => p.name === place.name);
    if (matchingPlace) {
      const text = `${matchingPlace.name} ${matchingPlace.category} ${matchingPlace.description || ''} ${Object.values(matchingPlace.tags).join(' ')}`;
      await queue.add('embed', { placeId: place.id, text });
    }
  }

  console.log(`[seed] Enqueued ${inserted.length} embedding jobs`);
  await queue.close();

  return inserted.length;
}
