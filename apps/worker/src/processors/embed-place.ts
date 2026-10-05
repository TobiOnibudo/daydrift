import { embedPlaceProcessor } from '@daydrift/core';
import { createEmbedPlaceWorker } from '@daydrift/queue';

import type { Logger } from '../logger.js';

/** Consumes `embed-place` jobs enqueued by the seeder and stores each place's vector. */
export function startEmbedPlaceWorker(logger: Logger): ReturnType<typeof createEmbedPlaceWorker> {
  const worker = createEmbedPlaceWorker(embedPlaceProcessor);

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, placeId: job?.data.placeId, err: String(err) }, 'embed failed');
  });

  return worker;
}
