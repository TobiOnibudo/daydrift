/**
 * @daydrift/db — Postgres client + Drizzle instance.
 * Connection string comes from @daydrift/config (the env SSOT). See docs/08.
 */
import { config } from '@daydrift/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema.js';

if (!config.database.url) {
  throw new Error('[@daydrift/db] DATABASE_URL is not configured.');
}

const client = postgres(config.database.url);

export const db = drizzle(client, { schema });
