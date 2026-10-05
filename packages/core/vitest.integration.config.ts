import { defineConfig } from 'vitest/config';

// Integration tests run against the docker-compose services, but in an isolated `daydrift_test`
// database and Redis db 1, so seeded development data is never touched.
try {
  process.loadEnvFile('../../.env');
} catch {
  // CI provides the environment directly.
}

const withPath = (url: string, path: string) => {
  const u = new URL(url);
  u.pathname = path;
  return u.toString();
};

const databaseUrl = withPath(
  process.env.DATABASE_URL ?? 'postgresql://daydrift:daydrift@localhost:5432/daydrift',
  '/daydrift_test',
);
const redisUrl = withPath(process.env.REDIS_URL ?? 'redis://localhost:6379', '/1');

process.env.DATABASE_URL = databaseUrl;
process.env.REDIS_URL = redisUrl;
process.env.AUTH_SECRET ??= 'test-only-secret-not-for-real-use-0123456789';
process.env.EMBEDDING_MODEL ??= 'nomic-embed-text';

export default defineConfig({
  test: {
    include: ['src/**/*.int.test.ts'],
    globalSetup: ['./src/__integration__/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
