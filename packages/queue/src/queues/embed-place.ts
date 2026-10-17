import { Queue, Worker } from 'bullmq';
import type { Processor, WorkerOptions } from 'bullmq';

import { createRedisConnection } from '../connection.js';

export const EMBED_PLACE_QUEUE = 'embed-place' as const;

export interface EmbedPlaceJobData {
  placeId: string;
  text: string;
}

const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: true,
  removeOnFail: 100,
} as const;

/** Producer queue for place-embedding jobs (one per place that lacks an embedding). */
export function createEmbedPlaceQueue(): Queue<
  EmbedPlaceJobData,
  unknown,
  string,
  EmbedPlaceJobData,
  unknown,
  string
> {
  return new Queue<EmbedPlaceJobData, unknown, string, EmbedPlaceJobData, unknown, string>(
    EMBED_PLACE_QUEUE,
    {
      connection: createRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTS,
    },
  );
}

/** Consumer for place-embedding jobs; modest concurrency keeps provider rate limits happy. */
export function createEmbedPlaceWorker(
  processor: Processor<EmbedPlaceJobData>,
  opts: Partial<WorkerOptions> = {},
): Worker<EmbedPlaceJobData> {
  return new Worker<EmbedPlaceJobData>(EMBED_PLACE_QUEUE, processor, {
    connection: createRedisConnection(),
    concurrency: 4,
    ...opts,
  });
}
