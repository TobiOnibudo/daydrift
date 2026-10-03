import { config } from '@daydrift/config';
import { Redis } from 'ioredis';

// Shared ioredis connection for BullMQ. `maxRetriesPerRequest: null` is
// required by BullMQ for its blocking commands (otherwise it throws).
export function createRedisConnection(): Redis {
  return new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
  });
}
