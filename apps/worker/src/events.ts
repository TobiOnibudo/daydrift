import { config } from '@daydrift/config';
import type { TripEvent } from '@daydrift/types';
import { Redis } from 'ioredis';

export interface TripEventPublisher {
  publish(tripId: string, event: TripEvent): Promise<void>;
  close(): Promise<void>;
}

export const tripChannel = (tripId: string) => `trip:${tripId}`;

/** Publishes trip events to Redis pub/sub; the API relays them to the browser over SSE. */
export function createTripEventPublisher(): TripEventPublisher {
  const redis = new Redis(config.redis.url);
  return {
    async publish(tripId, event) {
      await redis.publish(tripChannel(tripId), JSON.stringify(event));
    },
    async close() {
      await redis.quit().catch(() => undefined);
    },
  };
}
