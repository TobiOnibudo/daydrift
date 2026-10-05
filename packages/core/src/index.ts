// @daydrift/core — shared trip/planning domain logic (retrieval, scoring,
// itinerary post-processing, OSRM routing). See docs/03-rag-pipeline.md.

export * from './retrieval/index.js';
export * from './itinerary.js';
export * from './osrm.js';
export * from './prompt.js';
export * from './schemas.js';
export * from './seeding/seed-city.js';
export * from './seeding/embed-place.js';
export * from './seeding/mapping.js';
export * from './normalization.js';
export * from './trip-cache.js';
export { closeRedis, getRedis } from './redis.js';
export * from './trips/repository.js';
export * from './seeding/cities.js';
export * from './places/repository.js';
export * from './retrieval/semantic.js';
export * from './health.js';
export * from './evals/metrics.js';
export * from './evals/evaluate-retrieval.js';
export * from './evals/ground-truth.js';
