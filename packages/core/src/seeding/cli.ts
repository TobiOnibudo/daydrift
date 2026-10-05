import { seedCity, type CityDefinition } from './seed-city.js';

const TORONTO: CityDefinition = {
  name: 'Toronto',
  bbox: {
    south: 43.6,
    west: -79.45,
    north: 43.7,
    east: -79.35,
  },
};

seedCity(TORONTO)
  .then((count) => {
    console.log(`[seed] Seeded ${count} places for Toronto`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('[seed] Error:', err);
    process.exit(1);
  });
