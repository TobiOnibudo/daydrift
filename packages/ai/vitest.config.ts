import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    env: {
      AUTH_SECRET: 'test-only-secret-not-for-real-use-0123456789',
      EMBEDDING_MODEL: 'nomic-embed-text',
      LLM_PROVIDER: 'mock',
      EMBEDDING_PROVIDER: 'mock',
    },
  },
});
