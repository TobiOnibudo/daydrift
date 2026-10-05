import {
  buildFallbackItinerary,
  buildItineraryPrompt,
  buildNarrativePrompt,
  buildRefinePrompt,
  hashInput,
  normalizeItineraryLegs,
  pathDistanceKm,
  resolvePlaceRefs,
  stopRange,
  type ItineraryOutput,
  type RouteResult,
} from '@daydrift/core';
import type { AiPlanJobData } from '@daydrift/queue';
import type {
  CreateTripInput,
  Place,
  Trip,
  TripEvent,
  TripLeg,
  TripResult,
  TravelMode,
} from '@daydrift/types';

/** Everything the pipeline touches outside itself; injected so it can run without infra in tests. */
export interface AiPlanDeps {
  claimTrip(tripId: string): Promise<boolean>;
  completeTrip(tripId: string, result: TripResult): Promise<Trip | null>;
  failTrip(tripId: string): Promise<void>;
  /** Give up on a revision: the trip goes back to complete with its old itinerary. */
  restoreTrip(tripId: string): Promise<void>;
  getTrip(tripId: string): Promise<Trip | null>;
  getPlaces(ids: string[]): Promise<Place[]>;
  searchCandidates(input: CreateTripInput): Promise<Place[]>;
  planItinerary(prompt: string): Promise<ItineraryOutput>;
  streamNarrative(prompt: string): AsyncIterable<string>;
  route(legs: TripLeg[], mode: TravelMode): Promise<RouteResult>;
  cacheResult(hash: string, result: TripResult): Promise<void>;
  publish(tripId: string, event: TripEvent): Promise<void>;
  log(message: string, meta?: Record<string, unknown>): void;
}

const FALLBACK_NARRATIVE =
  "I couldn't write my full notes this time, so I picked a sensible route between the best matches for what you like. Tell me what you'd like changed and I'll adjust it.";

const FAILURE_MESSAGE = 'We could not generate your itinerary. Please try again.';

const REFINE_FAILURE_MESSAGE = "We couldn't make that change, so your trip is unchanged.";

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The ai-plan RAG pipeline (docs/03): retrieve -> generate (+ stream narrative) -> normalize ->
 * route -> persist -> cache -> publish. If generation fails, a proximity-ordered fallback itinerary
 * is persisted instead; only when that is impossible is the trip marked failed. The processor
 * resolves in every case, so BullMQ retries are reserved for crashes and stalls.
 */
export function createAiPlanProcessor(deps: AiPlanDeps) {
  return async (job: { id?: string; data: AiPlanJobData }): Promise<void> => {
    const { tripId, input } = job.data;
    const range = stopRange(input.duration);
    const log = (message: string, meta: Record<string, unknown> = {}) =>
      deps.log(message, { jobId: job.id, tripId, ...meta });

    const routeLegs = async (
      meta: Pick<TripResult, 'title' | 'vibeTags' | 'narrative'>,
      legs: TripLeg[],
    ): Promise<TripResult> => {
      let routeGeojson: unknown = null;
      let km = pathDistanceKm(legs);
      try {
        const route = await deps.route(legs, input.travelMode);
        routeGeojson = route.geojson;
        km = route.totalDistanceKm;
      } catch (err) {
        log('routing unavailable, falling back to straight-line distance', { err: String(err) });
      }
      return { ...meta, legs, routeGeojson, totalDistanceKm: round2(km) };
    };

    // Streams the guide's note to the client as it is written and returns the whole text so it can
    // be saved with the trip. A stream that breaks midway keeps what was written.
    const streamNarrative = async (
      itinerary: ItineraryOutput,
      candidates: Place[],
      instruction?: string,
    ): Promise<string> => {
      let written = '';
      try {
        for await (const text of deps.streamNarrative(
          buildNarrativePrompt(itinerary, candidates, instruction),
        )) {
          written += text;
          await deps.publish(tripId, { event: 'token', data: { text } });
        }
      } catch (err) {
        log('narrative streaming failed; continuing without it', { err: String(err) });
      }
      return written;
    };

    // Revise a finished trip as the traveler asked. The old itinerary stays in place until the new
    // one is saved, and any failure puts the trip back exactly as it was.
    const refineTrip = async (instruction: string): Promise<void> => {
      try {
        log('starting revision');
        await deps.publish(tripId, {
          event: 'status',
          data: { step: 'retrieving', label: 'Rethinking your day' },
        });
        const current = await deps.getTrip(tripId);
        if (!current || current.legs.length === 0) throw new Error('Nothing to revise');

        const known = new Map(
          (await deps.getPlaces(current.legs.map((l) => l.placeId))).map((p) => [p.id, p]),
        );
        const kept = current.legs.flatMap((l) => known.get(l.placeId) ?? []);
        const fresh = await deps.searchCandidates({
          ...input,
          interests: [...input.interests, instruction],
        });
        const candidates = [...kept, ...fresh.filter((p) => !kept.some((k) => k.id === p.id))];

        await deps.publish(tripId, {
          event: 'status',
          data: { step: 'generating', label: 'Updating your itinerary' },
        });
        const itinerary = resolvePlaceRefs(
          await deps.planItinerary(
            buildRefinePrompt(
              candidates,
              kept.map((p) => p.id),
              instruction,
              input,
            ),
          ),
          candidates,
        );
        const narrative = (await streamNarrative(itinerary, candidates, instruction)).trim();

        await deps.publish(tripId, {
          event: 'status',
          data: { step: 'routing', label: 'Mapping the route' },
        });
        const legs = normalizeItineraryLegs(itinerary.legs, candidates, range.min, range.max);
        const result = await routeLegs(
          {
            title: itinerary.title,
            vibeTags: itinerary.vibeTags,
            ...(narrative ? { narrative } : {}),
          },
          legs,
        );

        const trip = await deps.completeTrip(tripId, result);
        if (!trip) {
          log('trip was deleted during revision; discarding result');
          return;
        }
        await deps.publish(tripId, { event: 'complete', data: { trip } });
        log('revision complete');
      } catch (err) {
        log('revision failed; keeping the current itinerary', { err: String(err) });
        await deps.restoreTrip(tripId);
        await deps.publish(tripId, { event: 'failed', data: { message: REFINE_FAILURE_MESSAGE } });
      }
    };

    if (!(await deps.claimTrip(tripId))) {
      log('skipping: trip is gone or already finished');
      return;
    }
    if (job.data.refine) return refineTrip(job.data.refine.instruction);

    try {
      log('starting generation');
      await deps.publish(tripId, {
        event: 'status',
        data: { step: 'retrieving', label: 'Finding places' },
      });
      const candidates = await deps.searchCandidates(input);
      if (candidates.length < range.min) {
        throw new Error(`Only ${candidates.length} candidate places for ${input.city}`);
      }

      let result: TripResult;
      let cacheable = true;
      try {
        await deps.publish(tripId, {
          event: 'status',
          data: { step: 'generating', label: 'Building your itinerary' },
        });
        const itinerary = resolvePlaceRefs(
          await deps.planItinerary(buildItineraryPrompt(candidates, input)),
          candidates,
        );
        const narrative = (await streamNarrative(itinerary, candidates)).trim();

        await deps.publish(tripId, {
          event: 'status',
          data: { step: 'routing', label: 'Mapping the route' },
        });
        const legs = normalizeItineraryLegs(itinerary.legs, candidates, range.min, range.max);
        result = await routeLegs(
          {
            title: itinerary.title,
            vibeTags: itinerary.vibeTags,
            ...(narrative ? { narrative } : {}),
          },
          legs,
        );
      } catch (err) {
        log('generation failed; building fallback itinerary', { err: String(err) });
        const legs = buildFallbackItinerary(candidates, range.min, range.max);
        result = await routeLegs(
          {
            title: `${titleCase(input.city)}: ${input.duration} by ${input.travelMode}`,
            vibeTags: input.interests.slice(0, 3),
            narrative: FALLBACK_NARRATIVE,
          },
          legs,
        );
        cacheable = false;
      }

      const trip = await deps.completeTrip(tripId, result);
      if (!trip) {
        log('trip was deleted during generation; discarding result');
        return;
      }
      if (cacheable) {
        await deps
          .cacheResult(hashInput(input), result)
          .catch((err: unknown) => log('failed to cache result', { err: String(err) }));
      }
      await deps.publish(tripId, { event: 'complete', data: { trip } });
      log('generation complete', { fallback: !cacheable });
    } catch (err) {
      log('generation failed', { err: String(err) });
      await deps.failTrip(tripId);
      await deps.publish(tripId, { event: 'failed', data: { message: FAILURE_MESSAGE } });
    }
  };
}

export { FAILURE_MESSAGE, REFINE_FAILURE_MESSAGE };
