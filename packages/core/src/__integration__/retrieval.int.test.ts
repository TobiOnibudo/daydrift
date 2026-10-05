import { EMBEDDING_DIM } from '@daydrift/config';
import { db, places } from '@daydrift/db';
import { sql } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { closeRedis } from '../redis.js';
import { loadCityPool, vectorSearch } from '../retrieval/vector-search.js';

import { resetState } from './helpers.js';

/** A unit vector pointing mostly along `axis`, with a little of `blend` mixed into the next axis. */
const vec = (axis: number, blend = 0): number[] => {
  const v = new Array<number>(EMBEDDING_DIM).fill(0);
  v[axis] = 1;
  v[axis + 1] = blend;
  return v;
};

const place = (name: string, city: string, embedding: number[] | null) => ({
  name,
  city,
  category: 'cafe' as const,
  lat: 43.65,
  lng: -79.38,
  embedding,
});

beforeEach(async () => {
  await resetState();
  await db
    .insert(places)
    .values([
      place('exact', 'toronto', vec(0)),
      place('near', 'toronto', vec(0, 0.5)),
      place('far', 'toronto', vec(5)),
      place('not embedded yet', 'toronto', null),
      place('other city', 'montreal', vec(0)),
    ]);
});
afterAll(closeRedis);

describe('vector retrieval (real Postgres + pgvector)', () => {
  it('orders by cosine distance within the requested city only', async () => {
    const results = await vectorSearch(vec(0), 'Toronto', 10);
    expect(results.map((p) => p.name)).toEqual(['exact', 'near', 'far']);
  });

  it('respects the limit', async () => {
    expect(await vectorSearch(vec(0), 'toronto', 1)).toHaveLength(1);
  });

  it('never returns embeddings and skips places without one', async () => {
    const results = await vectorSearch(vec(0), 'toronto', 10);
    expect(results.every((p) => !('embedding' in p))).toBe(true);
    expect(results.map((p) => p.name)).not.toContain('not embedded yet');
  });

  it('loads the embedded city pool for the fallback top-up', async () => {
    const pool = await loadCityPool('toronto');
    expect(pool.map((p) => p.name).sort()).toEqual(['exact', 'far', 'near']);
  });

  // Small city-filtered queries legitimately choose an exact scan (perfect recall, cheaper at this
  // size); this only proves the index is valid for cosine ordering when the planner wants it.
  it('has a valid HNSW index the planner can use for cosine ordering', async () => {
    const plan = await db.transaction(async (tx) => {
      await tx.execute(sql`set local enable_seqscan = off`);
      return tx.execute(
        sql`explain select id from places order by embedding <=> ${JSON.stringify(vec(0))}::vector limit 5`,
      );
    });
    expect(JSON.stringify(plan)).toContain('places_embedding_hnsw_idx');
  });

  it('enforces one row per (osm_id, city)', async () => {
    const dupe = { ...place('dupe', 'toronto', null), osmId: 'node/1' };
    await db.insert(places).values(dupe);
    await expect(db.insert(places).values({ ...dupe, name: 'dupe 2' })).rejects.toThrow();
    await expect(db.insert(places).values({ ...dupe, city: 'montreal' })).resolves.toBeDefined();
  });
});
