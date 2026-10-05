import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.int.test.ts'],
    env: {
      AUTH_SECRET: 'test-only-secret-not-for-real-use-0123456789',
      EMBEDDING_MODEL: 'nomic-embed-text',
    },
  },
});
