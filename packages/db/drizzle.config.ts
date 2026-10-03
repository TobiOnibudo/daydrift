import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit config. Migrations are generated from ./src/schema.ts into
 * ./migrations and committed to the repo (docs/02 "Migration strategy").
 * The DB URL is read from the environment here (drizzle-kit runs as a CLI).
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
