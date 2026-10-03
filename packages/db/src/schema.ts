/**
 * @daydrift/db — Drizzle schema (Postgres + pgvector). See docs/02-data-model.md.
 *
 * The `embedding` column dimension comes from @daydrift/config (EMBEDDING_DIM),
 * the single source of truth, so the column and its HNSW index can never drift
 * (fixes v1 bug #3). See docs/08-config-env.md.
 */
import { EMBEDDING_DIM } from '@daydrift/config';
import { customType, pgTable, uuid, text, real, jsonb, timestamp } from 'drizzle-orm/pg-core';

/**
 * Lightweight pgvector column type. Full vector read/write support lives in
 * downstream query code; here we only need the correct dimension-typed DDL.
 */
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return `vector(${EMBEDDING_DIM})`;
  },
});

/** Per-city corpus of candidate stops with embeddings (docs/02). */
export const places = pgTable('places', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  osmId: text('osm_id'),
  tags: jsonb('tags'),
  embedding: vector('embedding'), // nullable until the embed job completes
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** Generated itineraries, with async status and an input hash for caching (docs/02). */
export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  city: text('city'),
  interests: jsonb('interests'),
  duration: text('duration'),
  travelMode: text('travel_mode'),
  title: text('title'),
  legs: jsonb('legs'),
  routeGeojson: jsonb('route_geojson'),
  totalDistanceKm: real('total_distance_km'),
  vibeTags: jsonb('vibe_tags'),
  status: text('status').notNull().default('pending'),
  inputHash: text('input_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Better Auth tables (`user`, `session`, `account`, `verification`) are managed
 * by Better Auth's Drizzle adapter and intentionally not fully defined here.
 * See docs/02-data-model.md — keep model keys singular so the adapter resolves
 * them. The minimal `user` stub below exists only so FKs/types can reference it.
 */
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
