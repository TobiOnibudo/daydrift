/**
 * @daydrift/db — Drizzle schema (Postgres + pgvector). See docs/02-data-model.md.
 *
 * The `embedding` column dimension comes from @daydrift/config (EMBEDDING_DIM),
 * the single source of truth, so the column and its HNSW index can never drift
 * (fixes v1 bug #3). See docs/08-config-env.md.
 */
import { EMBEDDING_DIM } from '@daydrift/config';
import type { PlaceCategory, TripLeg, TripStatus } from '@daydrift/types';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

/** Better Auth tables (shape required by the Drizzle adapter; model keys are singular). */
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/** Per-city corpus of candidate stops with embeddings (docs/02). */
export const places = pgTable(
  'places',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    city: text('city').notNull(),
    category: text('category').$type<PlaceCategory>().notNull(),
    description: text('description'),
    lat: real('lat').notNull(),
    lng: real('lng').notNull(),
    osmId: text('osm_id'),
    tags: jsonb('tags').$type<Record<string, string>>(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIM }), // null until the embed job completes
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    cityIdx: index('places_city_idx').on(t.city),
    osmIdCityUidx: uniqueIndex('places_osm_id_city_uidx').on(t.osmId, t.city),
    embeddingHnswIdx: index('places_embedding_hnsw_idx')
      .using('hnsw', t.embedding.op('vector_cosine_ops'))
      .with({ m: 16, ef_construction: 64 }),
  }),
);

/** Generated itineraries, with async status and an input hash for caching (docs/02). */
export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    city: text('city').notNull(),
    interests: jsonb('interests').$type<string[]>().notNull(),
    duration: text('duration').notNull(),
    travelMode: text('travel_mode').notNull(),
    stopCount: integer('stop_count').notNull().default(5),
    locationPreference: text('location_preference').notNull().default(''),
    title: text('title'),
    legs: jsonb('legs').$type<TripLeg[]>(),
    routeGeojson: jsonb('route_geojson'),
    totalDistanceKm: real('total_distance_km'),
    vibeTags: jsonb('vibe_tags').$type<string[]>(),
    narrative: text('narrative'),
    status: text('status').$type<TripStatus>().notNull().default('pending'),
    inputHash: text('input_hash').notNull(),
    shareToken: text('share_token').unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index('trips_user_id_idx').on(t.userId),
    inputHashIdx: index('trips_input_hash_idx').on(t.inputHash),
  }),
);
