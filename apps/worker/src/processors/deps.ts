import { generateObject, streamText } from '@daydrift/ai';
import {
  cacheTripResult,
  claimTrip,
  completeTrip,
  failTrip,
  fetchRoute,
  getPlacesByIds,
  getTripById,
  ItineraryOutputSchema,
  restoreTrip,
  searchCandidatePlaces,
} from '@daydrift/core';

import type { TripEventPublisher } from '../events.js';
import type { Logger } from '../logger.js';

import type { AiPlanDeps } from './ai-plan.js';

/** Production wiring for the ai-plan pipeline. */
export function createAiPlanDeps(publisher: TripEventPublisher, logger: Logger): AiPlanDeps {
  return {
    claimTrip,
    completeTrip,
    failTrip,
    restoreTrip,
    getTrip: getTripById,
    getPlaces: getPlacesByIds,
    searchCandidates: searchCandidatePlaces,
    planItinerary: async (prompt) =>
      (await generateObject({ schema: ItineraryOutputSchema, prompt })).object,
    streamNarrative: async function* (prompt) {
      const result = await streamText({ prompt });
      yield* result.textStream;
    },
    route: (legs, mode) => fetchRoute(legs, mode),
    cacheResult: cacheTripResult,
    publish: (tripId, event) => publisher.publish(tripId, event),
    log: (message, meta) => logger.info(meta ?? {}, message),
  };
}
