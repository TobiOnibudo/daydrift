import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { closeRedis } from '../redis.js';
import {
  claimTrip,
  completeTrip,
  deleteTrip,
  failTrip,
  getSharedTrip,
  getTrip,
  insertTrip,
  listTrips,
  resetTrip,
  shareTrip,
  unshareTrip,
} from '../trips/repository.js';

import { createUser, resetState } from './helpers.js';

const input = {
  city: 'toronto',
  interests: ['art'],
  duration: 'half-day' as const,
  travelMode: 'walking' as const,
};
const result = {
  title: 'A Day',
  legs: [
    {
      placeId: '7d4b8a3e-7c43-4f6f-9d1b-1f2b7a9c0e11',
      name: 'Spot',
      order: 1,
      lat: 43.65,
      lng: -79.38,
    },
  ],
  routeGeojson: { type: 'LineString', coordinates: [[-79.38, 43.65]] },
  totalDistanceKm: 1.5,
  vibeTags: ['chill'],
};

let alice: string;
let bob: string;

beforeEach(async () => {
  await resetState();
  alice = await createUser('alice');
  bob = await createUser('bob');
});
afterAll(closeRedis);

describe('trip repository (real Postgres)', () => {
  it('runs the pending -> processing -> complete lifecycle and persists the result', async () => {
    const trip = await insertTrip({ userId: alice, input, inputHash: 'h1' });
    expect(trip.status).toBe('pending');

    expect(await claimTrip(trip.id)).toBe(true);
    const done = await completeTrip(trip.id, result);
    expect(done).toMatchObject({ status: 'complete', title: 'A Day', totalDistanceKm: 1.5 });

    const stored = await getTrip(trip.id, alice);
    expect(stored?.legs).toEqual(result.legs);
    expect(stored?.routeGeojson).toEqual(result.routeGeojson);
    expect(stored?.vibeTags).toEqual(['chill']);
  });

  it('creates an already-complete trip from a cached result', async () => {
    const trip = await insertTrip({ userId: alice, input, inputHash: 'h1', result });
    expect(trip).toMatchObject({ status: 'complete', title: 'A Day' });
    expect(trip.legs).toHaveLength(1);
  });

  it('does not claim or fail a trip that has already finished', async () => {
    const trip = await insertTrip({ userId: alice, input, inputHash: 'h1' });
    await completeTrip(trip.id, result);

    expect(await claimTrip(trip.id)).toBe(false);
    await failTrip(trip.id);
    expect((await getTrip(trip.id, alice))?.status).toBe('complete');
  });

  it('marks an in-flight trip failed', async () => {
    const trip = await insertTrip({ userId: alice, input, inputHash: 'h1' });
    await claimTrip(trip.id);
    await failTrip(trip.id);
    expect((await getTrip(trip.id, alice))?.status).toBe('failed');
  });

  it("isolates users: nobody can read, list, delete or reset another user's trip", async () => {
    const trip = await insertTrip({ userId: alice, input, inputHash: 'h1' });

    expect(await getTrip(trip.id, bob)).toBeNull();
    expect(await listTrips(bob)).toEqual([]);
    expect(await deleteTrip(trip.id, bob)).toBe(false);
    expect(await resetTrip(trip.id, bob)).toBeNull();
    expect(await getTrip(trip.id, alice)).not.toBeNull();
  });

  it('lists newest first and filters by city case-insensitively', async () => {
    const first = await insertTrip({ userId: alice, input, inputHash: 'h1' });
    await insertTrip({ userId: alice, input: { ...input, city: 'montreal' }, inputHash: 'h2' });
    const third = await insertTrip({ userId: alice, input, inputHash: 'h3' });

    const all = await listTrips(alice);
    expect(all).toHaveLength(3);
    expect(all[0]?.id).toBe(third.id);
    expect((await listTrips(alice, ' Toronto ')).map((t) => t.id)).toEqual([third.id, first.id]);
  });

  it('resets a finished trip back to pending and clears its result', async () => {
    const trip = await insertTrip({ userId: alice, input, inputHash: 'h1', result });
    const reset = await resetTrip(trip.id, alice);

    expect(reset).toMatchObject({
      status: 'pending',
      title: null,
      legs: [],
      totalDistanceKm: null,
    });
    expect(reset?.city).toBe('toronto');
  });

  it('deletes only the owner’s trip', async () => {
    const trip = await insertTrip({ userId: alice, input, inputHash: 'h1' });
    expect(await deleteTrip(trip.id, alice)).toBe(true);
    expect(await getTrip(trip.id, alice)).toBeNull();
  });

  describe('sharing', () => {
    it('shares only completed trips the caller owns, with a stable token', async () => {
      const trip = await insertTrip({ userId: alice, input, inputHash: 'h1' });
      expect(await shareTrip(trip.id, alice)).toBeNull(); // still pending

      await completeTrip(trip.id, result);
      expect(await shareTrip(trip.id, bob)).toBeNull(); // not the owner
      const token = await shareTrip(trip.id, alice);
      expect(token).toMatch(/^[A-Za-z0-9_-]{16,}$/);
      expect(await shareTrip(trip.id, alice)).toBe(token);
    });

    it('exposes a public view without the owner or token, until unshared', async () => {
      const trip = await insertTrip({ userId: alice, input, inputHash: 'h1', result });
      const token = (await shareTrip(trip.id, alice)) as string;

      const shared = await getSharedTrip(token);
      expect(shared).toMatchObject({ id: trip.id, title: 'A Day' });
      expect(shared).not.toHaveProperty('userId');
      expect(shared).not.toHaveProperty('shareToken');

      expect(await unshareTrip(trip.id, bob)).toBe(false);
      expect(await unshareTrip(trip.id, alice)).toBe(true);
      expect(await getSharedTrip(token)).toBeNull();
    });

    it('hides a shared trip while it is being regenerated', async () => {
      const trip = await insertTrip({ userId: alice, input, inputHash: 'h1', result });
      const token = (await shareTrip(trip.id, alice)) as string;
      await resetTrip(trip.id, alice);
      expect(await getSharedTrip(token)).toBeNull();
    });
  });
});
