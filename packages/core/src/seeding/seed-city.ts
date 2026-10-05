import { db, places } from '@daydrift/db';
import { createEmbedPlaceQueue } from '@daydrift/queue';
import { and, eq, isNull } from 'drizzle-orm';

import { invalidateCityPlacePool } from '../retrieval/cache.js';

import { capByCategory, mapOverpassToPlace, placeEmbeddingText } from './mapping.js';
import type { PlaceInsert } from './mapping.js';
import { fetchPlacesFromOverpass, type BoundingBox } from './overpass.js';

export interface CityDefinition {
  name: string;
  bbox: BoundingBox;
}

export interface SeedResult {
  fetched: number;
  kept: number;
  inserted: number;
  embeddingJobs: number;
}

const INSERT_CHUNK = 500;

/**
 * Fetch a city's POIs from Overpass, insert the new ones, and enqueue an embedding job for
 * every place in the city that still lacks a vector. Safe to re-run: existing places are
 * skipped (unique osm_id + city) and interrupted embedding runs are picked back up.
 */
export async function seedCity(city: CityDefinition): Promise<SeedResult> {
  const cityKey = city.name.trim().toLowerCase();

  const fetched = await fetchPlacesFromOverpass(city.bbox);
  const kept = capByCategory(fetched.flatMap((osm) => mapOverpassToPlace(osm, city.name) ?? []));

  let inserted = 0;
  for (let i = 0; i < kept.length; i += INSERT_CHUNK) {
    const rows: PlaceInsert[] = kept.slice(i, i + INSERT_CHUNK);
    const result = await db
      .insert(places)
      .values(rows)
      .onConflictDoNothing({ target: [places.osmId, places.city] })
      .returning({ id: places.id });
    inserted += result.length;
  }

  const pending = await db
    .select({
      id: places.id,
      name: places.name,
      category: places.category,
      description: places.description,
      tags: places.tags,
    })
    .from(places)
    .where(and(eq(places.city, cityKey), isNull(places.embedding)));

  const queue = createEmbedPlaceQueue();
  try {
    await queue.addBulk(
      pending.map((p) => ({
        name: 'embed',
        data: { placeId: p.id, text: placeEmbeddingText(p) },
        opts: { jobId: `embed-${p.id}` },
      })),
    );
  } finally {
    await queue.close();
  }

  await invalidateCityPlacePool(cityKey);

  return { fetched: fetched.length, kept: kept.length, inserted, embeddingJobs: pending.length };
}
