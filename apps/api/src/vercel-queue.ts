import { send } from '@vercel/queue';
import type { AiPlanJobData } from '@daydrift/queue';

/** Minimal producer contract shared by BullMQ locally and Vercel Queues in production. */
export interface AiPlanJobProducer {
  add(name: string, data: AiPlanJobData, options?: { jobId?: string }): Promise<unknown>;
  close(): Promise<void>;
}

/**
 * Vercel Queues replaces the always-on BullMQ worker in the Vercel deployment.
 * The idempotency key protects the create endpoint from a duplicate retry.
 */
export function createVercelAiPlanQueue(): AiPlanJobProducer {
  return {
    add: async (_name, data, options) =>
      send('ai-plan', data, {
        idempotencyKey: options?.jobId,
        retentionSeconds: 86_400,
      }),
    close: async () => undefined,
  };
}
