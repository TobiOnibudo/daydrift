import { config } from '@daydrift/config';
import { Redis } from 'ioredis';

let client: Redis | undefined;

/** Lazily-created shared Redis client for caches, so importing core never opens a socket. */
export function getRedis(): Redis {
  client ??= new Redis(config.redis.url);
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = undefined;
  }
}
