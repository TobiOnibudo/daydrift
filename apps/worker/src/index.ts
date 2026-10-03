import { embed, generateObject, streamText } from '@daydrift/ai';
import { config } from '@daydrift/config';
import {
  searchCandidatePlaces,
  normalizeItineraryLegs,
  buildFallbackItinerary,
  fetchRoute,
} from '@daydrift/core';
import { db } from '@daydrift/db';
import { createAiPlanWorker, type AiPlanJobData } from '@daydrift/queue';
import { Redis } from 'ioredis';
import { z } from 'zod';

// Native background worker — NO HTTP server (docs/01 §Process model, fixes v1 #6).

// Publisher connection for status / token / complete / failed events.
const publisher = new Redis(config.redis.url);

/** Publish a structured event to the trip's Redis channel (relayed by the API over SSE). */
async function publish(
  tripId: string,
  event: 'status' | 'token' | 'complete' | 'failed',
  data: unknown,
): Promise<void> {
  await publisher.publish(`trip:${tripId}`, JSON.stringify({ event, data }));
}

/**
 * The ai-plan processor: the RAG pipeline from docs/03.
 * Control flow + pub/sub + terminal events are wired; domain logic is TODO.
 */
async function processor(job: { id?: string; data: AiPlanJobData }): Promise<void> {
  const { tripId, input } = job.data;
  // Duration-derived stop range (docs/03 §5). TODO: refine per duration value.
  const minStops = 3;
  const maxStops = 6;
  const log = (msg: string) => {
     
    console.log(`[ai-plan][job:${job.id ?? 'unknown'}][trip:${tripId}] ${msg}`);
  };

  log('starting generation');

  try {
    // --- 3. Retrieval: embed query + vector search over the city pool ---
    await publish(tripId, 'status', { step: 'retrieving', label: 'Finding places' });
    log('Finding places');
    // TODO: build query string from normalized city + interests + duration/mode.
    void embed;
    const candidatesAll = await searchCandidatePlaces({
      city: input.city,
      interests: input.interests,
      duration: input.duration,
      travelMode: input.travelMode,
    });

    // --- 4. Score + diversify → top 15 ---
    const candidates = candidatesAll.slice(0, 15);

    // --- 5 & 6. Prompt + structured generation with streamed narrative ---
    await publish(tripId, 'status', { step: 'generating', label: 'Building itinerary' });
    log('Building itinerary');
    // TODO: construct the real prompt + itinerary schema from the 15 candidates.
    const itinerary = await generateObject({
      schema: z.object({ title: z.string(), legs: z.array(z.unknown()) }),
      prompt: `TODO: build itinerary prompt for ${input.city}`,
    });

    // Stream the narrative tokens to the trip channel as they arrive.
    const narrative = streamText({ prompt: `TODO: narrative prompt for ${input.city}` });
    // TODO: iterate narrative token stream and publish each chunk:
    //   for await (const token of narrative.textStream) {
    //     await publish(tripId, 'token', { text: token });
    //   }
    void narrative;

    // --- 7. Post-process: normalize legs + enrich coords + route ---
    await publish(tripId, 'status', { step: 'routing', label: 'Routing' });
    log('Routing');
    const legs = normalizeItineraryLegs([], candidates, minStops);
    const route = await fetchRoute(legs.map((leg) => ({ lat: leg.lat, lng: leg.lng })));

    // --- 8. Persistence: mark trip complete + publish complete ---
    // TODO: update trips row (status=complete, title, legs, route_geojson, ...).
    void db;
    void itinerary;
    void legs;
    void route;

    const trip = { id: tripId /* TODO: full persisted trip */ };
    await publish(tripId, 'complete', { trip });
    log('generation complete');
  } catch (error) {
    // --- 9. Failure / fallback: try an in-process fallback before failing ---
    log(`generation error: ${String(error)}`);
    try {
      const fallbackLegs = buildFallbackItinerary([], minStops, maxStops);
      // TODO: persist fallback as a complete trip (status=complete).
      void db;
      await publish(tripId, 'complete', { trip: { id: tripId, legs: fallbackLegs } });
      log('recovered via fallback itinerary');
    } catch (fallbackError) {
      // TODO: update trips row status=failed.
      void db;
      log(`fallback failed: ${String(fallbackError)}`);
      await publish(tripId, 'failed', {
        message: 'We could not generate your itinerary. Please try again.',
      });
    }
  }
}

// Start the ai-plan worker (consumes the Redis-backed BullMQ queue).
const worker = createAiPlanWorker(processor);

 
console.log('[worker] ai-plan worker started');

// Graceful shutdown.
async function shutdown(): Promise<void> {
  await worker.close();
  publisher.disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
