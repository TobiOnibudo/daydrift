import { EMBEDDING_DIM } from '@daydrift/config';
import { sql } from 'drizzle-orm';

import { db } from './client.js';

/**
 * Fail fast if the database's `places.embedding` column was created for a different dimension than
 * the configured embedding model produces (v1 bug #3). Call once at startup, before serving.
 */
export async function assertEmbeddingDimension(expected: number = EMBEDDING_DIM): Promise<void> {
  let actual: number | undefined;
  try {
    const rows = await db.execute<{ dim: number }>(
      sql`select atttypmod as dim from pg_attribute where attrelid = 'places'::regclass and attname = 'embedding'`,
    );
    actual = rows[0]?.dim;
  } catch {
    throw new Error('The places table is missing. Run the database migrations (pnpm db:migrate).');
  }

  if (actual !== expected) {
    throw new Error(
      `Embedding dimension mismatch: the database column is vector(${actual}) but the configured ` +
        `model produces ${expected}. Set EMBEDDING_DIM (or EMBEDDING_MODEL) to match the schema, or ` +
        `re-provision the column and re-embed (docs/02).`,
    );
  }
}
