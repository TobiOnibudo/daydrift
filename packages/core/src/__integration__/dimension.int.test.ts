import { EMBEDDING_DIM } from '@daydrift/config';
import { assertEmbeddingDimension } from '@daydrift/db';
import { describe, expect, it } from 'vitest';

describe('embedding dimension guard (real Postgres)', () => {
  it('accepts a database whose column matches the configured model', async () => {
    await expect(assertEmbeddingDimension()).resolves.toBeUndefined();
  });

  it('refuses to start when the column and the model disagree, explaining how to fix it', async () => {
    const wrong = EMBEDDING_DIM === 1536 ? 768 : 1536;
    const error = await assertEmbeddingDimension(wrong).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(`vector(${EMBEDDING_DIM})`);
    expect((error as Error).message).toContain(`produces ${wrong}`);
  });
});
