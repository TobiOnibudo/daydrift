/**
 * @daydrift/types — Zod schemas + inferred TypeScript types shared across apps
 * and packages (the SSOT for data shapes). Reads @daydrift/config for the
 * dimension-dependent embedding shape; nothing else internal. See docs/01, docs/02.
 */
import { EMBEDDING_DIM } from '@daydrift/config';
import { z } from 'zod';

/** Supported place categories (mirrors the `place_category` DB enum, docs/02). */
export const PlaceCategorySchema = z.enum([
  'cafe',
  'restaurant',
  'museum',
  'park',
  'gallery',
  'market',
  'viewpoint',
  'theatre',
  'landmark',
]);
export type PlaceCategory = z.infer<typeof PlaceCategorySchema>;

/** An embedding vector — length pinned to the configured dimension (docs/08). */
export const EmbeddingSchema = z.array(z.number()).length(EMBEDDING_DIM);
export type Embedding = z.infer<typeof EmbeddingSchema>;

/** A candidate stop in a city's corpus. */
export const PlaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  city: z.string(),
  category: PlaceCategorySchema,
  description: z.string().nullable().optional(),
  lat: z.number(),
  lng: z.number(),
  osmId: z.string().nullable().optional(),
  tags: z.record(z.unknown()).nullable().optional(),
  embedding: EmbeddingSchema.nullable().optional(),
  createdAt: z.date(),
});
export type Place = z.infer<typeof PlaceSchema>;

/** Async trip-generation lifecycle (mirrors the `trip_status` DB enum, docs/02). */
export const TripStatusSchema = z.enum(['pending', 'processing', 'complete', 'failed']);
export type TripStatus = z.infer<typeof TripStatusSchema>;

/** Trip duration bucket. */
export const DurationSchema = z.enum(['2h', 'half-day', 'full-day']);
export type Duration = z.infer<typeof DurationSchema>;

/** How the traveler moves between stops. */
export const TravelModeSchema = z.enum(['walking', 'cycling', 'driving']);
export type TravelMode = z.infer<typeof TravelModeSchema>;

/** Input accepted when creating a trip. */
export const CreateTripInputSchema = z.object({
  city: z.string(),
  interests: z.array(z.string()),
  duration: DurationSchema,
  travelMode: TravelModeSchema,
});
export type CreateTripInput = z.infer<typeof CreateTripInputSchema>;

/** A single normalized leg of an itinerary. */
export const TripLegSchema = z.object({
  placeId: z.string().uuid(),
  name: z.string(),
  order: z.number().int(),
  note: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
});
export type TripLeg = z.infer<typeof TripLegSchema>;

/** A generated itinerary. */
export const TripSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  city: z.string(),
  interests: z.array(z.string()),
  duration: DurationSchema,
  travelMode: TravelModeSchema,
  title: z.string().nullable().optional(),
  legs: z.array(TripLegSchema),
  routeGeojson: z.unknown(),
  totalDistanceKm: z.number().nullable().optional(),
  vibeTags: z.array(z.string()),
  status: TripStatusSchema,
  createdAt: z.date(),
});
export type Trip = z.infer<typeof TripSchema>;
