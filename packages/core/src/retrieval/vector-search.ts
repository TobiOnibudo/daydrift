
import { embed } from '@daydrift/ai';
import { db, places } from '@daydrift/db';
import type { Place } from '@daydrift/types';
import { sql } from 'drizzle-orm';

export async function vectorSearch(
  query: string,
  city: string,
  limit: number,
): Promise<Place[]> {
  // Generate query embedding
  const queryEmbedding = await embed(query);

  // HNSW cosine distance search
  const results = await db
    .select()
    .from(places)
    .where(
      sql`${places.city} = ${city.toLowerCase()} AND ${places.embedding} IS NOT NULL`,
    )
    .orderBy(sql`${places.embedding} <=> ${JSON.stringify(queryEmbedding)}`)
    .limit(limit);

  return results.map((r) => ({
    id: r.id,
    osmId: r.osmId,
    name: r.name,
    city: r.city,
    category: r.category as Place['category'],
    description: r.description,
    lat: r.lat,
    lng: r.lng,
    tags: r.tags as Record<string, string>,
    createdAt: r.createdAt,
  }));
}
