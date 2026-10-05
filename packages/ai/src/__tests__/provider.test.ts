import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function embeddingModel(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  const { getEmbeddingModel } = await import('../provider.js');
  return getEmbeddingModel() as unknown as { settings: { dimensions?: number }; modelId: string };
}

describe('OpenAI embedding provider', () => {
  const base = { EMBEDDING_PROVIDER: 'openai', OPENAI_API_KEY: 'sk-test' };

  it('requests exactly the configured dimension from text-embedding-3 models', async () => {
    const model = await embeddingModel({
      ...base,
      EMBEDDING_MODEL: 'text-embedding-3-small',
      EMBEDDING_DIM: '768',
    });
    expect(model.modelId).toBe('text-embedding-3-small');
    expect(model.settings.dimensions).toBe(768);
  });

  it('does not send a dimensions setting to other models', async () => {
    const model = await embeddingModel({
      ...base,
      EMBEDDING_MODEL: 'my-model',
      EMBEDDING_DIM: '384',
    });
    expect(model.settings.dimensions).toBeUndefined();
  });
});
