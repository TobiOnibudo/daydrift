import { embed } from '@daydrift/ai';
import { db, places } from '@daydrift/db';
import type { EmbedPlaceJobData } from '@daydrift/queue';
import { eq } from 'drizzle-orm';

/** BullMQ processor for the `embed-place` queue: embed the text and store the vector. */
export async function embedPlaceProcessor(job: { data: EmbedPlaceJobData }): Promise<void> {
  const { placeId, text } = job.data;
  const embedding = await embed(text);
  await db.update(places).set({ embedding }).where(eq(places.id, placeId));
}
