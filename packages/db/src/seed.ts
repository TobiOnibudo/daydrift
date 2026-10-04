import { createEmbedPlaceQueue } from '@daydrift/queue';

import { db } from './client.js';
import { places } from './schema.js';
import { mapOverpassToPlace } from './seeding/mapping.js';
import { fetchPlacesFromOverpass, type BoundingBox } from './seeding/overpass.js';

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

// CLI entry point
const TORONTO: CityDefinition = {
  name: 'Toronto',
  bbox: {
    south: 43.6,
    west: -79.45,
    north: 43.7,
    east: -79.35,
  },
};

seedCity(TORONTO)
  .then((count) => {
    console.log(`[seed] Seeded ${count} places for Toronto`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('[seed] Error:', err);
    process.exit(1);
  });
