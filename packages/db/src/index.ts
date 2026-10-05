/**
 * @daydrift/db — public entry point. Re-exports the Drizzle client and schema.
 */
export { db } from './client.js';
export * from './schema.js';
export { assertEmbeddingDimension } from './health.js';
