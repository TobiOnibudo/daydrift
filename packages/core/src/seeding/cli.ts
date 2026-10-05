import { CITIES, findCity } from './cities.js';
import { seedCity } from './seed-city.js';

const requested = process.argv[2] ?? 'toronto';
const city = findCity(requested);

if (!city) {
  console.error(`Unknown city "${requested}". Known: ${Object.keys(CITIES).join(', ')}`);
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
