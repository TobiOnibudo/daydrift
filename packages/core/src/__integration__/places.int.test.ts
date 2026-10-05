import { EMBEDDING_DIM } from '@daydrift/config';
import { db, places } from '@daydrift/db';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { getPlace, listCities, listPlaces } from '../places/repository.js';
import { closeRedis } from '../redis.js';

import { resetState } from './helpers.js';

const embedding = new Array<number>(EMBEDDING_DIM).fill(0.1);
const row = (name: string, city: string, category: 'cafe' | 'park', withVector: boolean) => ({
  name,
  city,
  category,
  lat: 43.65,
  lng: -79.38,
  embedding: withVector ? embedding : null,
});

beforeEach(async () => {
  await resetState();
  await db
    .insert(places)
    .values([
      row('Bean', 'toronto', 'cafe', true),
      row('Grounds', 'toronto', 'cafe', true),
      row('High Park', 'toronto', 'park', true),
      row('Unembedded', 'toronto', 'park', false),
      row('Old Port', 'montreal', 'park', true),
      row('Pending Only', 'halifax', 'cafe', false),
    ]);
});
afterAll(closeRedis);

describe('places repository (real Postgres)', () => {
  it('lists only cities that have embedded places, with counts and display names', async () => {
    expect(await listCities()).toEqual([
      { key: 'montreal', name: 'Montreal', placeCount: 1 },
      { key: 'toronto', name: 'Toronto', placeCount: 3 },
    ]);
  });

  it('filters the catalog by city and category, sorted by name, without embeddings', async () => {
    const cafes = await listPlaces({ city: ' Toronto ', category: 'cafe' });
    expect(cafes.map((p) => p.name)).toEqual(['Bean', 'Grounds']);
    expect('embedding' in cafes[0]!).toBe(false);
  });

  it('fetches one place or null', async () => {
    const [bean] = await listPlaces({ city: 'toronto', category: 'cafe' });
    expect((await getPlace(bean!.id))?.name).toBe('Bean');
    expect(await getPlace('7d4b8a3e-7c43-4f6f-9d1b-1f2b7a9c0e11')).toBeNull();
  });
});
