import { seedCity, type CityDefinition } from './seed-city.js';

const CITIES: Record<string, CityDefinition> = {
  toronto: {
    name: 'Toronto',
    bbox: { south: 43.62, west: -79.43, north: 43.7, east: -79.34 },
  },
};

const key = (process.argv[2] ?? 'toronto').toLowerCase();
const city = CITIES[key];

if (!city) {
  console.error(`Unknown city "${key}". Known: ${Object.keys(CITIES).join(', ')}`);
  process.exit(1);
}

console.log(`[seed] Seeding ${city.name} from Overpass...`);
seedCity(city)
  .then((result) => {
    console.log('[seed] Done:', result);
    console.log('[seed] Embedding jobs are queued; run the worker (pnpm dev) to process them.');
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
