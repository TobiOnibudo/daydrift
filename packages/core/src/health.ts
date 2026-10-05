import { db } from '@daydrift/db';
import { sql } from 'drizzle-orm';

import { getRedis } from './redis.js';

export interface DependencyHealth {
  database: boolean;
  redis: boolean;
}

/** Ping Postgres and Redis; never throws. */
export async function checkDependencies(): Promise<DependencyHealth> {
  const [database, redis] = await Promise.allSettled([
    db.execute(sql`select 1`),
    getRedis().ping(),
  ]);
  return { database: database.status === 'fulfilled', redis: redis.status === 'fulfilled' };
}
