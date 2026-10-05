import { db, places } from '@daydrift/db';
import type { Place, PlaceCategory } from '@daydrift/types';
import { and, asc, count, eq, isNotNull } from 'drizzle-orm';

import { placeColumns } from '../retrieval/columns.js';
import { findCity } from '../seeding/cities.js';

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

export interface CitySummary {
  /** Lowercase key used in queries and trip inputs. */
  key: string;
  /** Display name. */
  name: string;
  placeCount: number;
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** Cities that have embedded places, i.e. the ones trips can actually be planned for. */
export async function listCities(): Promise<CitySummary[]> {
  const rows = await db
    .select({ city: places.city, placeCount: count() })
    .from(places)
    .where(isNotNull(places.embedding))
    .groupBy(places.city)
    .orderBy(asc(places.city));

  return rows.map((r) => ({
    key: r.city,
    name: findCity(r.city)?.name ?? titleCase(r.city),
    placeCount: r.placeCount,
  }));
}
