import type { CreateTripInput } from '@daydrift/types';
import { Queue, Worker } from 'bullmq';
import type { Processor, WorkerOptions } from 'bullmq';

import { createRedisConnection } from './connection.js';

// Daydrift uses a SINGLE queue for AI trip planning (docs/01-architecture.md:
// one queue only). Job tuning (lockDuration, attempts, backoff) follows
// docs/09-observability-errors.md.

/** The one and only queue name. */
export const AI_PLAN_QUEUE = 'ai-plan' as const;

/** Payload for an `ai-plan` job: the trip row id plus its normalized input. */
export interface AiPlanJobData {
  tripId: string;
  input: CreateTripInput;
}

/** Default worker options. `lockDuration` ~10min covers slow LLM generation. */
const DEFAULT_WORKER_OPTS: Partial<WorkerOptions> = {
  lockDuration: 600_000,
  concurrency: 1,
};

/** Default job options: retry transient provider failures with backoff. */
const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: true,
  removeOnFail: false,
} as const;

/** Create the `ai-plan` producer queue. */
export function createAiPlanQueue(): Queue<AiPlanJobData> {
  return new Queue<AiPlanJobData>(AI_PLAN_QUEUE, {
    connection: createRedisConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTS,
  });
}

/** Create the `ai-plan` worker that consumes jobs with the given processor. */
export function createAiPlanWorker(
  processor: Processor<AiPlanJobData>,
  opts: Partial<WorkerOptions> = {},
): Worker<AiPlanJobData> {
  return new Worker<AiPlanJobData>(AI_PLAN_QUEUE, processor, {
    connection: createRedisConnection(),
    ...DEFAULT_WORKER_OPTS,
    ...opts,
  });
}

export { createRedisConnection } from './connection.js';
export * from './queues/embed-place.js';
export type { EmbedPlaceJobData } from './queues/embed-place.js';
