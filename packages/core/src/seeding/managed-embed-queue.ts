import { send } from '@vercel/queue';
import type { EmbedPlaceJobData } from '@daydrift/queue';

/** Managed background-queue producer used when a seed runs in a serverless API. */
export function createManagedEmbedPlaceQueue() {
  return {
    addBulk: async (
      jobs: Array<{ data: EmbedPlaceJobData; opts?: { jobId?: string } }>,
    ): Promise<void> => {
      await Promise.all(
        jobs.map(({ data, opts }) =>
          send('embed-place', data, {
            idempotencyKey: opts?.jobId,
            retentionSeconds: 86_400,
          }),
        ),
      );
    },
    close: async (): Promise<void> => undefined,
  };
}
