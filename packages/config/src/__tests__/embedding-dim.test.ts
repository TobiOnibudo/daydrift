import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function dimFor(env: Record<string, string>) {
  vi.resetModules();
  vi.stubEnv('AUTH_SECRET', 'test-only-secret-not-for-real-use-0123456789');
  vi.stubEnv('EMBEDDING_DIM', '');
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return (await import('../index.js')).EMBEDDING_DIM;
}

describe('EMBEDDING_DIM resolution', () => {
  it('uses the native dimension of a known model', async () => {
    expect(await dimFor({ EMBEDDING_MODEL: 'nomic-embed-text' })).toBe(768);
    expect(await dimFor({ EMBEDDING_MODEL: 'text-embedding-3-small' })).toBe(1536);
    expect(await dimFor({ EMBEDDING_MODEL: 'text-embedding-3-large' })).toBe(3072);
  });

  it('lets OpenAI text-embedding-3 models be shortened so one schema serves dev and prod', async () => {
    expect(await dimFor({ EMBEDDING_MODEL: 'text-embedding-3-small', EMBEDDING_DIM: '768' })).toBe(
      768,
    );
  });

  it('rejects shortening beyond the native size and any override for fixed-size models', async () => {
    await expect(
      dimFor({ EMBEDDING_MODEL: 'text-embedding-3-small', EMBEDDING_DIM: '2048' }),
    ).rejects.toThrow(/at most 1536/);
    await expect(
      dimFor({ EMBEDDING_MODEL: 'nomic-embed-text', EMBEDDING_DIM: '1536' }),
    ).rejects.toThrow(/must be 768/);
  });

  it('requires an explicit dimension for an unknown model', async () => {
    await expect(dimFor({ EMBEDDING_MODEL: 'my-custom-model' })).rejects.toThrow(
      /EMBEDDING_DIM is required/,
    );
    expect(await dimFor({ EMBEDDING_MODEL: 'my-custom-model', EMBEDDING_DIM: '384' })).toBe(384);
  });

  it('requires a model at all', async () => {
    await expect(dimFor({ EMBEDDING_MODEL: '' })).rejects.toThrow(/EMBEDDING_MODEL is required/);
  });
});

describe('blank environment variables', () => {
  it('are treated as unset rather than crashing on an empty string', async () => {
    vi.resetModules();
    vi.stubEnv('AUTH_SECRET', 'test-only-secret-not-for-real-use-0123456789');
    vi.stubEnv('EMBEDDING_MODEL', 'nomic-embed-text');
    vi.stubEnv('EMBEDDING_DIM', '');
    vi.stubEnv('LLM_TIMEOUT_MS', '  ');
    const { config, EMBEDDING_DIM } = await import('../index.js');
    expect(EMBEDDING_DIM).toBe(768);
    expect(config.llm.timeoutMs).toBe(90_000);
  });
});
