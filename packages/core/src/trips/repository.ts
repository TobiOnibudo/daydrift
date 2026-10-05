import { randomBytes } from 'node:crypto';

import { db, trips } from '@daydrift/db';
import type { CreateTripInput, Duration, Trip, TripResult, TravelMode } from '@daydrift/types';
import { and, desc, eq, inArray } from 'drizzle-orm';

type TripRow = typeof trips.$inferSelect;

export function tripFromRow(row: TripRow): Trip {
  return {
    id: row.id,
    userId: row.userId,
    city: row.city,
    interests: row.interests,
    duration: row.duration as Duration,
    travelMode: row.travelMode as TravelMode,
    title: row.title,
    legs: row.legs ?? [],
    routeGeojson: row.routeGeojson,
    totalDistanceKm: row.totalDistanceKm,
    vibeTags: row.vibeTags ?? [],
    narrative: row.narrative,
    status: row.status,
    shareToken: row.shareToken,
    createdAt: row.createdAt,
  };
}

/** The generation input a stored trip was created from (used by regenerate). */
export function tripInput(trip: Trip): CreateTripInput {
  return {
    city: trip.city,
    interests: trip.interests,
    duration: trip.duration,
    travelMode: trip.travelMode,
  };
}

const resultColumns = (result: TripResult) => ({
  title: result.title,
  legs: result.legs,
  routeGeojson: result.routeGeojson ?? null,
  totalDistanceKm: result.totalDistanceKm,
  vibeTags: result.vibeTags,
  narrative: result.narrative ?? null,
});

/** Insert a trip for `userId`; pass a cached `result` to create it already complete. */
export async function insertTrip(args: {
  userId: string;
  input: CreateTripInput;
  inputHash: string;
  result?: TripResult;
}): Promise<Trip> {
  const [row] = await db
    .insert(trips)
    .values({
      userId: args.userId,
      city: args.input.city,
      interests: args.input.interests,
      duration: args.input.duration,
      travelMode: args.input.travelMode,
      inputHash: args.inputHash,
      status: args.result ? 'complete' : 'pending',
      ...(args.result ? resultColumns(args.result) : {}),
    })
    .returning();
  if (!row) throw new Error('Failed to insert trip');
  return tripFromRow(row);
}

/** Mark a pending/processing trip as processing. False if it is gone or already finished. */
export async function claimTrip(id: string): Promise<boolean> {
  const rows = await db
    .update(trips)
    .set({ status: 'processing' })
    .where(and(eq(trips.id, id), inArray(trips.status, ['pending', 'processing'])))
    .returning({ id: trips.id });
  return rows.length > 0;
}

export async function completeTrip(id: string, result: TripResult): Promise<Trip | null> {
  const [row] = await db
    .update(trips)
    .set({ status: 'complete', ...resultColumns(result) })
    .where(eq(trips.id, id))
    .returning();
  return row ? tripFromRow(row) : null;
}

export async function failTrip(id: string): Promise<void> {
  await db
    .update(trips)
    .set({ status: 'failed' })
    .where(and(eq(trips.id, id), inArray(trips.status, ['pending', 'processing'])));
}

export async function getTrip(id: string, userId: string): Promise<Trip | null> {
  const [row] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)));
  return row ? tripFromRow(row) : null;
}

export async function listTrips(userId: string, city?: string): Promise<Trip[]> {
  const rows = await db
    .select()
    .from(trips)
    .where(
      city
        ? and(eq(trips.userId, userId), eq(trips.city, city.trim().toLowerCase()))
        : eq(trips.userId, userId),
    )
    .orderBy(desc(trips.createdAt))
    .limit(100);
  return rows.map(tripFromRow);
}

export async function deleteTrip(id: string, userId: string): Promise<boolean> {
  const rows = await db
    .delete(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .returning({ id: trips.id });
  return rows.length > 0;
}

/** Clear a trip's result and put it back to pending so it can be regenerated. */
export async function resetTrip(id: string, userId: string): Promise<Trip | null> {
  const [row] = await db
    .update(trips)
    .set({
      status: 'pending',
      title: null,
      legs: null,
      routeGeojson: null,
      totalDistanceKm: null,
      vibeTags: null,
      narrative: null,
    })
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .returning();
  return row ? tripFromRow(row) : null;
}

/** A trip as exposed through a public share link: no owner, no token. */
export type SharedTrip = Omit<Trip, 'userId' | 'shareToken'>;

/** Enable sharing for a completed trip, returning its (stable) token. Null if not found or unfinished. */
export async function shareTrip(id: string, userId: string): Promise<string | null> {
  const trip = await getTrip(id, userId);
  if (!trip || trip.status !== 'complete') return null;
  if (trip.shareToken) return trip.shareToken;

  const token = randomBytes(16).toString('base64url');
  const [row] = await db
    .update(trips)
    .set({ shareToken: token })
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .returning({ shareToken: trips.shareToken });
  return row?.shareToken ?? null;
}

export async function unshareTrip(id: string, userId: string): Promise<boolean> {
  const rows = await db
    .update(trips)
    .set({ shareToken: null })
    .where(and(eq(trips.id, id), eq(trips.userId, userId)))
    .returning({ id: trips.id });
  return rows.length > 0;
}

/** Public read by share token; only completed trips are ever exposed. */
export async function getSharedTrip(token: string): Promise<SharedTrip | null> {
  const [row] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.shareToken, token), eq(trips.status, 'complete')));
  if (!row) return null;
  const { userId: _userId, shareToken: _shareToken, ...shared } = tripFromRow(row);
  return shared;
}

/** Save an edited itinerary on a finished trip the caller owns. Null if not found or not finished. */
export async function updateTripStops(
  id: string,
  userId: string,
  result: TripResult,
): Promise<Trip | null> {
  const [row] = await db
    .update(trips)
    .set({
      legs: result.legs,
      routeGeojson: result.routeGeojson ?? null,
      totalDistanceKm: result.totalDistanceKm,
    })
    .where(and(eq(trips.id, id), eq(trips.userId, userId), eq(trips.status, 'complete')))
    .returning();
  return row ? tripFromRow(row) : null;
}
