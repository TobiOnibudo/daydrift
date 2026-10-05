import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makePlace } from './fixtures.js';

const embed = vi.fn(async (_text: string) => [0.1, 0.2]);
const vectorSearch = vi.fn();
const loadCityPool = vi.fn();
const getCityPlacePool = vi.fn();
const setCityPlacePool = vi.fn();

vi.mock('@daydrift/ai', () => ({ embed }));
vi.mock('../retrieval/vector-search.js', () => ({ vectorSearch, loadCityPool }));
vi.mock('../retrieval/cache.js', () => ({
  getCityPlacePool,
  setCityPlacePool,
  invalidateCityPlacePool: vi.fn(),
}));

const { searchCandidatePlaces, CANDIDATE_LIMIT } = await import('../retrieval/index.js');

const input = {
  city: 'Toronto',
  interests: ['art'],
  duration: 'half-day' as const,
  travelMode: 'walking' as const,
};

const many = (n: number, prefix = 'p') =>
  Array.from({ length: n }, (_, i) =>
    makePlace({ id: `${prefix}${i}`, lat: 43.6 + i * 0.01, lng: -79.4 + i * 0.01 }),
  );

beforeEach(() => vi.clearAllMocks());

describe('searchCandidatePlaces', () => {
  it('embeds the query and skips the pool when vector results are plentiful', async () => {
    vectorSearch.mockResolvedValue(many(30));

    const result = await searchCandidatePlaces(input);

    expect(embed).toHaveBeenCalledOnce();
    expect(vectorSearch).toHaveBeenCalledWith([0.1, 0.2], 'Toronto', 50);
    expect(getCityPlacePool).not.toHaveBeenCalled();
    expect(result).toHaveLength(CANDIDATE_LIMIT);
  });

  it('tops up thin results from the cached pool without duplicates', async () => {
    vectorSearch.mockResolvedValue(many(3));
    getCityPlacePool.mockResolvedValue([...many(3), ...many(10, 'pool')]);

    const result = await searchCandidatePlaces(input);

    expect(loadCityPool).not.toHaveBeenCalled();
    expect(result).toHaveLength(13);
    expect(new Set(result.map((p) => p.id)).size).toBe(13);
  });

  it('loads and caches the pool on a cache miss', async () => {
    vectorSearch.mockResolvedValue([]);
    getCityPlacePool.mockResolvedValue(null);
    loadCityPool.mockResolvedValue(many(5));

    const result = await searchCandidatePlaces(input);

    expect(setCityPlacePool).toHaveBeenCalledWith('Toronto', expect.any(Array));
    expect(result).toHaveLength(5);
  });

  it('returns nothing for a city with no embedded places', async () => {
    vectorSearch.mockResolvedValue([]);
    getCityPlacePool.mockResolvedValue(null);
    loadCityPool.mockResolvedValue([]);

    expect(await searchCandidatePlaces(input)).toEqual([]);
    expect(setCityPlacePool).not.toHaveBeenCalled();
  });
});
