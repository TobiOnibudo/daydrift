import {
  buildFallbackItinerary,
  buildItineraryPrompt,
  buildNarrativePrompt,
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
  searchCandidates(input: CreateTripInput): Promise<Place[]>;
  planItinerary(prompt: string): Promise<ItineraryOutput>;
  streamNarrative(prompt: string): AsyncIterable<string>;
  route(legs: TripLeg[], mode: TravelMode): Promise<RouteResult>;
  cacheResult(hash: string, result: TripResult): Promise<void>;
  publish(tripId: string, event: TripEvent): Promise<void>;
  log(message: string, meta?: Record<string, unknown>): void;
}

const FAILURE_MESSAGE = 'We could not generate your itinerary. Please try again.';

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
      meta: Pick<TripResult, 'title' | 'vibeTags'>,
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

    const streamNarrative = async (itinerary: ItineraryOutput, candidates: Place[]) => {
      try {
        for await (const text of deps.streamNarrative(
          buildNarrativePrompt(itinerary, candidates),
        )) {
          await deps.publish(tripId, { event: 'token', data: { text } });
        }
      } catch (err) {
        log('narrative streaming failed; continuing without it', { err: String(err) });
      }
    };

    if (!(await deps.claimTrip(tripId))) {
      log('skipping: trip is gone or already finished');
      return;
    }

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
        await streamNarrative(itinerary, candidates);

        await deps.publish(tripId, {
          event: 'status',
          data: { step: 'routing', label: 'Mapping the route' },
        });
        const legs = normalizeItineraryLegs(itinerary.legs, candidates, range.min, range.max);
        result = await routeLegs({ title: itinerary.title, vibeTags: itinerary.vibeTags }, legs);
      } catch (err) {
        log('generation failed; building fallback itinerary', { err: String(err) });
        const legs = buildFallbackItinerary(candidates, range.min, range.max);
        result = await routeLegs(
          {
            title: `${titleCase(input.city)}: ${input.duration} by ${input.travelMode}`,
            vibeTags: input.interests.slice(0, 3),
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

export { FAILURE_MESSAGE };
