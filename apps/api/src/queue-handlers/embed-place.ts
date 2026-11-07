import { QueueClient, type MessageMetadata } from '@vercel/queue';
import { closeRedis, embedPlaceProcessor } from '@daydrift/core';
import type { EmbedPlaceJobData } from '@daydrift/queue';

const queue = new QueueClient();

/** Managed queue consumer for place embeddings. */
export default queue.handleNodeCallback<EmbedPlaceJobData>(
  async (message, _metadata: MessageMetadata) => {
    try {
      await embedPlaceProcessor({ data: message });
    } finally {
      await closeRedis();
    }
  },
  {
    visibilityTimeoutSeconds: 300,
    retry: (_error, metadata) => ({ afterSeconds: Math.min(300, 2 ** metadata.deliveryCount * 5) }),
  },
);
