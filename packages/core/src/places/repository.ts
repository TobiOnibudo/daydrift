import { db, places } from '@daydrift/db';
import type { Place, PlaceCategory } from '@daydrift/types';
import { and, asc, eq } from 'drizzle-orm';

import { placeColumns } from '../retrieval/columns.js';

const MAX_LIST = 200;

export async function listPlaces(filter: {
  city?: string;
  category?: PlaceCategory;
}): Promise<Place[]> {
  const conditions = [
    filter.city ? eq(places.city, filter.city.trim().toLowerCase()) : undefined,
    filter.category ? eq(places.category, filter.category) : undefined,
  ].filter((c) => c !== undefined);

  return db
    .select(placeColumns)
    .from(places)
    .where(and(...conditions))
    .orderBy(asc(places.name))
    .limit(MAX_LIST);
}

export async function getPlace(id: string): Promise<Place | null> {
  const [row] = await db.select(placeColumns).from(places).where(eq(places.id, id));
  return row ?? null;
}
