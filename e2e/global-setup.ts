import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';

import { BASE_URL, DATABASE_URL, REDIS_URL, serverEnv } from './env';

const root = resolve(import.meta.dirname, '..');
const children: ChildProcess[] = [];

const FIXTURE_PLACES: Array<[string, string, number, number]> = [
  ['Royal Ontario Museum', 'museum', 43.6677, -79.3948],
  ['Art Gallery of Ontario', 'gallery', 43.6536, -79.3925],
  ['Pilot Coffee Roasters', 'cafe', 43.6498, -79.3718],
  ['St. Lawrence Market', 'market', 43.6487, -79.3715],
  ['High Park', 'park', 43.6465, -79.4637],
  ['Trinity Bellwoods Park', 'park', 43.6476, -79.4132],
  ['CN Tower Lookout', 'viewpoint', 43.6426, -79.3871],
  ['Casa Loma', 'landmark', 43.678, -79.4094],
  ['Massey Hall', 'theatre', 43.6543, -79.3786],
  ['Kensington Market', 'market', 43.6548, -79.4005],
  ['Bar Raval', 'restaurant', 43.6577, -79.4098],
  ['Fort York', 'landmark', 43.6386, -79.4042],
];

async function prepareDatabase(): Promise<void> {
  const postgres = (await import('postgres')).default;
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { migrate } = await import('drizzle-orm/postgres-js/migrator');

  const target = new URL(DATABASE_URL);
  const admin = new URL(target);
  admin.pathname = '/postgres';
  const adminClient = postgres(admin.toString(), { max: 1 });
  const exists =
    await adminClient`select 1 from pg_database where datname = ${target.pathname.slice(1)}`;
  if (exists.length === 0)
    await adminClient.unsafe(`create database "${target.pathname.slice(1)}"`);
  await adminClient.end();

  const client = postgres(DATABASE_URL, { max: 1 });
  await migrate(drizzle(client), { migrationsFolder: resolve(root, 'packages/db/migrations') });
  await client.unsafe(
    'truncate table trips, places, session, account, verification, "user" cascade',
  );
  await client.end();

  // Load the shared packages only now, after the environment points at the e2e database.
  Object.assign(process.env, serverEnv);
  const { db, places } = await import('@daydrift/db');
  const { mockEmbedding } = await import('@daydrift/ai');
  const { EMBEDDING_DIM } = await import('@daydrift/config');

  await db.insert(places).values(
    FIXTURE_PLACES.map(([name, category, lat, lng]) => ({
      name,
      category: category as 'museum',
      city: 'toronto',
      description: category,
      lat,
      lng,
      osmId: `fixture/${name}`,
      embedding: mockEmbedding(`${name}. ${category}`, EMBEDDING_DIM),
    })),
  );
}

async function flushRedis(): Promise<void> {
  const { Redis } = await import('ioredis');
  const redis = new Redis(REDIS_URL);
  await redis.flushdb();
  await redis.quit();
}

function start(name: string, script: string): ChildProcess {
  const child = spawn(process.execPath, [resolve(root, script)], {
    cwd: root,
    env: serverEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr?.on('data', (d: Buffer) => process.stderr.write(`[${name}] ${d}`));
  child.on('exit', (code) => code && console.error(`[${name}] exited with code ${code}`));
  children.push(child);
  return child;
}

async function waitForReady(): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE_URL}/health/ready`)).ok) return;
    } catch {
      // server still starting
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('The API did not become ready in 60s');
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  await prepareDatabase();
  await flushRedis();
  start('api', 'apps/api/dist/server.js');
  start('worker', 'apps/worker/dist/index.js');
  await waitForReady();

  return async () => {
    for (const child of children) child.kill();
  };
}
