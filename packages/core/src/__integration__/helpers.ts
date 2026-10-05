import { db, user } from '@daydrift/db';
import { sql } from 'drizzle-orm';

import { getRedis } from '../redis.js';

/** Empty every table and the test Redis db so each test file starts from nothing. */
export async function resetState(): Promise<void> {
  await db.execute(
    sql`truncate table trips, places, session, account, verification, "user" cascade`,
  );
  await getRedis().flushdb();
}

export async function createUser(id: string): Promise<string> {
  await db.insert(user).values({ id, name: id, email: `${id}@example.com` });
  return id;
}
