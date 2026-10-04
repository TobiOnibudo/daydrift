import { Queue, Worker } from 'bullmq';

import { config } from '@daydrift/config';

export interface EmbedPlaceJobData {
  placeId: string;
  text: string;
}

export function createEmbedPlaceQueue(): Queue<EmbedPlaceJobData> {
  return new Queue<EmbedPlaceJobData>('embed-place', {
    connection: { url: config.redis.url },
  });
}

export function createEmbedPlaceWorker(
  processor: (job: { data: EmbedPlaceJobData }) => Promise<void>,
): Worker<EmbedPlaceJobData> {
  return new Worker<EmbedPlaceJobData>('embed-place', processor, {
    connection: { url: config.redis.url },
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });
}
