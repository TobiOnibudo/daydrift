import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      AUTH_SECRET: 'test-only-secret-not-for-real-use-0123456789',
      EMBEDDING_MODEL: 'nomic-embed-text',
    },
  },
});
