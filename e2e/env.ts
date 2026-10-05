import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load the workspace .env when present (local dev); CI provides the environment directly.
const envFile = resolve(import.meta.dirname, '../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const PORT = 3100;
export const BASE_URL = `http://127.0.0.1:${PORT}`;

const withPath = (url: string, path: string) => {
  const u = new URL(url);
  u.pathname = path;
  return u.toString();
};

// Isolated from development data: its own database and Redis db.
export const DATABASE_URL = withPath(
  process.env.DATABASE_URL ?? 'postgresql://daydrift:daydrift@localhost:5432/daydrift',
  '/daydrift_e2e',
);
export const REDIS_URL = withPath(process.env.REDIS_URL ?? 'redis://localhost:6379', '/2');

/** Environment for the API and worker under test: real Postgres/Redis, offline mock AI. */
export const serverEnv = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: String(PORT),
  BASE_URL,
  WEB_URL: BASE_URL,
  DATABASE_URL,
  REDIS_URL,
  AUTH_SECRET: 'e2e-only-secret-not-for-real-use-0123456789',
  LLM_PROVIDER: 'mock',
  EMBEDDING_PROVIDER: 'mock',
  EMBEDDING_MODEL: 'nomic-embed-text',
  LLM_TIMEOUT_MS: '30000',
  // Nothing listens here, so routing fails fast and trips use the straight-line fallback.
  OSRM_BASE_URL: 'http://127.0.0.1:9',
} satisfies NodeJS.ProcessEnv;
