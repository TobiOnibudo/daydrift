import { send } from '@vercel/queue';
import type { AiPlanJobData } from '@daydrift/queue';

/** Minimal producer contract shared by the persistent and serverless runtimes. */
export interface AiPlanJobProducer {
  add(name: string, data: AiPlanJobData, options?: { jobId?: string }): Promise<unknown>;
  close(): Promise<void>;
}

/**
 * Publishes jobs to the managed background queue when no persistent worker is
 * available. The transport is selected by deployment configuration, not the
 * business route that creates a trip.
 */
export function createManagedAiPlanQueue(): AiPlanJobProducer {
  return {
    add: async (_name, data, options) =>
      send('ai-plan', data, {
        idempotencyKey: options?.jobId,
        retentionSeconds: 86_400,
      }),
    close: async () => undefined,
  };
}
