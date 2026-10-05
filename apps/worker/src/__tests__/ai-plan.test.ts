import type { ItineraryOutput } from '@daydrift/core';
import type { Place, Trip, TripEvent, TripResult } from '@daydrift/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAiPlanProcessor, FAILURE_MESSAGE, type AiPlanDeps } from '../processors/ai-plan.js';

const input = {
  city: 'toronto',
  interests: ['art', 'coffee'],
  duration: '2h' as const,
  travelMode: 'walking' as const,
};

const place = (n: number): Place => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  name: `Place ${n}`,
  city: 'toronto',
  category: 'cafe',
  description: null,
  lat: 43.65 + n * 0.001,
  lng: -79.38,
  osmId: `node/${n}`,
  tags: {},
  createdAt: new Date(),
});

const candidates = [1, 2, 3, 4, 5].map(place);

const plan: ItineraryOutput = {
  title: 'Art & Coffee',
  vibeTags: ['artsy'],
  legs: [
    { placeId: candidates[2]!.id, order: 2, rationale: 'b' },
    { placeId: candidates[0]!.id, order: 1, rationale: 'a' },
    { placeId: 'hallucinated', order: 3, rationale: 'x' },
    { placeId: candidates[4]!.id, order: 4, rationale: 'c' },
  ],
};

const fakeTrip = (result: TripResult): Trip => ({
  id: 'trip-1',
  userId: 'u1',
  city: 'toronto',
  interests: input.interests,
  duration: input.duration,
  travelMode: input.travelMode,
  status: 'complete',
  createdAt: new Date(),
  ...result,
});

const job = { id: 'job-1', data: { tripId: 'trip-1', input } };

let events: TripEvent[];
let deps: AiPlanDeps;

beforeEach(() => {
  events = [];
  deps = {
    claimTrip: vi.fn(async () => true),
    completeTrip: vi.fn(async (_id, result) => fakeTrip(result)),
    failTrip: vi.fn(async () => undefined),
    searchCandidates: vi.fn(async () => candidates),
    planItinerary: vi.fn(async () => plan),
    streamNarrative: vi.fn(async function* () {
      yield 'Start ';
      yield 'here.';
    }),
    route: vi.fn(async () => ({
      geojson: { type: 'LineString' as const, coordinates: [] },
      totalDistanceKm: 3.456,
    })),
    cacheResult: vi.fn(async () => undefined),
    publish: vi.fn(async (_id, event) => {
      events.push(event);
    }),
    log: vi.fn(),
  };
});

const run = () => createAiPlanProcessor(deps)(job);
const eventNames = () => events.map((e) => e.event);

describe('ai-plan processor', () => {
  it('runs retrieve -> generate -> stream -> route -> persist -> cache -> complete', async () => {
    await run();

    expect(eventNames()).toEqual(['status', 'status', 'token', 'token', 'status', 'complete']);
    expect(
      events
        .filter((e) => e.event === 'status')
        .map((e) => (e as never as { data: { step: string } }).data.step),
    ).toEqual(['retrieving', 'generating', 'routing']);

    const [, saved] = vi.mocked(deps.completeTrip).mock.calls[0]!;
    expect(saved.title).toBe('Art & Coffee');
    // hallucinated id dropped; order respected; padded to the 2h minimum of 3 is already met
    expect(saved.legs.map((l) => l.placeId)).toEqual([
      candidates[0]!.id,
      candidates[2]!.id,
      candidates[4]!.id,
    ]);
    expect(saved.totalDistanceKm).toBe(3.46);
    expect(deps.cacheResult).toHaveBeenCalledOnce();
    expect(deps.failTrip).not.toHaveBeenCalled();
  });

  it('skips work when the trip is gone or already finished', async () => {
    vi.mocked(deps.claimTrip).mockResolvedValue(false);
    await run();
    expect(deps.searchCandidates).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('persists a proximity fallback (uncached) when generation fails', async () => {
    vi.mocked(deps.planItinerary).mockRejectedValue(new Error('provider down'));
    await run();

    const [, saved] = vi.mocked(deps.completeTrip).mock.calls[0]!;
    expect(saved.legs).toHaveLength(3);
    expect(saved.title).toContain('Toronto');
    expect(deps.cacheResult).not.toHaveBeenCalled();
    expect(eventNames().at(-1)).toBe('complete');
    expect(deps.failTrip).not.toHaveBeenCalled();
  });

  it('marks the trip failed when there are too few candidates for any itinerary', async () => {
    vi.mocked(deps.searchCandidates).mockResolvedValue(candidates.slice(0, 2));
    await run();

    expect(deps.failTrip).toHaveBeenCalledWith('trip-1');
    expect(deps.completeTrip).not.toHaveBeenCalled();
    expect(events.at(-1)).toEqual({ event: 'failed', data: { message: FAILURE_MESSAGE } });
  });

  it('still completes without a route when OSRM is down, using straight-line distance', async () => {
    vi.mocked(deps.route).mockRejectedValue(new Error('osrm down'));
    await run();

    const [, saved] = vi.mocked(deps.completeTrip).mock.calls[0]!;
    expect(saved.routeGeojson).toBeNull();
    expect(saved.totalDistanceKm).toBeGreaterThan(0);
    expect(eventNames().at(-1)).toBe('complete');
  });

  it('completes even if narrative streaming fails midway', async () => {
    vi.mocked(deps.streamNarrative).mockImplementation(async function* () {
      yield 'partial';
      throw new Error('stream broke');
    });
    await run();

    expect(eventNames()).toContain('token');
    expect(eventNames().at(-1)).toBe('complete');
  });

  it('does not publish complete if the trip was deleted mid-run', async () => {
    vi.mocked(deps.completeTrip).mockResolvedValue(null);
    await run();
    expect(eventNames()).not.toContain('complete');
    expect(deps.cacheResult).not.toHaveBeenCalled();
  });
});
