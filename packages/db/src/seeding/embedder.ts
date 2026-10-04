import { eq } from 'drizzle-orm';

import { embed } from '@daydrift/ai';
import type { EmbedPlaceJobData } from '@daydrift/queue';

import { db } from '../client.js';
import { places } from '../schema.js';

export async function embedPlaceProcessor(job: {
  data: EmbedPlaceJobData;
}): Promise<void> {
  const { placeId, text } = job.data;

  console.log(`[embedder] Embedding place ${placeId}`);

  const embedding = await embed(text);

  await db
    .update(places)
    .set({ embedding: embedding as unknown as number[] })
    .where(eq(places.id, placeId));

  console.log(`[embedder] Completed place ${placeId}`);
}
