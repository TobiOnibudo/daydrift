import { defineConfig } from 'drizzle-kit';

// drizzle-kit loads this file as CommonJS and runs as a CLI, so it reads DATABASE_URL
// directly (loading the workspace .env) instead of importing @daydrift/config.
try {
  process.loadEnvFile('../../.env');
} catch {
  // No .env (e.g. CI/Railway): rely on the real environment.
}

/**
 * Migrations are generated from ./src/schema.ts into ./migrations and committed
 * (docs/02 "Migration strategy"). They are applied explicitly (`pnpm db:migrate`,
 * Railway preDeploy) — never at runtime.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
