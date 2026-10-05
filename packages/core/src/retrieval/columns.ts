import { places } from '@daydrift/db';
import type { Place } from '@daydrift/types';

/** Every place column except the embedding, which is large and never needed after retrieval. */
export const placeColumns = {
  id: places.id,
  name: places.name,
  city: places.city,
  category: places.category,
  description: places.description,
  lat: places.lat,
  lng: places.lng,
  osmId: places.osmId,
  tags: places.tags,
  createdAt: places.createdAt,
} as const;

export type PlaceRow = {
  [K in keyof typeof placeColumns]: Place[K];
};
