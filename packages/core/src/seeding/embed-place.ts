import { eq } from 'drizzle-orm';

import { embed } from '@daydrift/ai';
import { db, places } from '@daydrift/db';
import type { EmbedPlaceJobData } from '@daydrift/queue';


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
