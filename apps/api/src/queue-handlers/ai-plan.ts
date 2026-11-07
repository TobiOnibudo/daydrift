import { QueueClient, type MessageMetadata } from '@vercel/queue';
import { closeRedis } from '@daydrift/core';
import type { AiPlanJobData } from '@daydrift/queue';

import { createTripEventPublisher } from '@daydrift/worker/events';
import { logger } from '@daydrift/worker/logger';
import { createAiPlanProcessor } from '@daydrift/worker/processors/ai-plan';
import { createAiPlanDeps } from '@daydrift/worker/processors/deps';

const queue = new QueueClient();

/** Managed queue consumer for AI itinerary generation. */
export default queue.handleNodeCallback<AiPlanJobData>(
  async (message, metadata: MessageMetadata) => {
    const publisher = createTripEventPublisher();
    try {
      const processor = createAiPlanProcessor(createAiPlanDeps(publisher, logger));
      await processor({ id: metadata.messageId, data: message });
    } finally {
      await Promise.all([publisher.close(), closeRedis()]);
    }
  },
  {
    visibilityTimeoutSeconds: 300,
    retry: (_error, metadata) => ({ afterSeconds: Math.min(300, 2 ** metadata.deliveryCount * 5) }),
  },
);
