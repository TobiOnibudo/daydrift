import { closeRedis, failTrip } from '@daydrift/core';
import { assertEmbeddingDimension } from '@daydrift/db';
import { createAiPlanWorker } from '@daydrift/queue';

import { createTripEventPublisher } from './events.js';
import { logger } from './logger.js';
import { createAiPlanProcessor, FAILURE_MESSAGE } from './processors/ai-plan.js';
import { createAiPlanDeps } from './processors/deps.js';
import { startEmbedPlaceWorker } from './processors/embed-place.js';

// Native background worker: no HTTP server (docs/01 §Process model, fixes v1 #6).

await assertEmbeddingDimension();

const publisher = createTripEventPublisher();
const aiPlanWorker = createAiPlanWorker(createAiPlanProcessor(createAiPlanDeps(publisher, logger)));
const embedPlaceWorker = startEmbedPlaceWorker(logger);

// The processor resolves even on generation failure, so a BullMQ failure means a crash or a
// stalled job that exhausted its retries: mark the trip failed and tell any listening client.
aiPlanWorker.on('failed', (job, err) => {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
  const { tripId } = job.data;
  logger.error({ jobId: job.id, tripId, err: String(err) }, 'ai-plan job exhausted retries');
  void failTrip(tripId)
    .then(() => publisher.publish(tripId, { event: 'failed', data: { message: FAILURE_MESSAGE } }))
    .catch((e: unknown) =>
      logger.error({ tripId, err: String(e) }, 'could not record job failure'),
    );
});

logger.info('workers started: ai-plan, embed-place');

async function shutdown(): Promise<void> {
  logger.info('shutting down');
  await Promise.all([aiPlanWorker.close(), embedPlaceWorker.close()]);
  await Promise.all([publisher.close(), closeRedis()]);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
