import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

/** Create the isolated test database if needed and apply the real migrations to it. */
export default async function setup(): Promise<void> {
  const target = new URL(process.env.DATABASE_URL as string);
  const dbName = target.pathname.slice(1);

  const admin = new URL(target);
  admin.pathname = '/postgres';
  const adminClient = postgres(admin.toString(), { max: 1 });
  const exists = await adminClient`select 1 from pg_database where datname = ${dbName}`;
  if (exists.length === 0) await adminClient.unsafe(`create database "${dbName}"`);
  await adminClient.end();

  const client = postgres(target.toString(), { max: 1 });
  await migrate(drizzle(client), {
    migrationsFolder: fileURLToPath(new URL('../../../db/migrations', import.meta.url)),
  });
  await client.end();
}
