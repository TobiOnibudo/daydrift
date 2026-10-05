import { describe, it, expect } from 'vitest';

import { selectDiverseCandidates } from '../retrieval/diversity.js';

import { makePlace } from './fixtures.js';

describe('selectDiverseCandidates', () => {
  const scored = [
    { place: makePlace({ id: 'c1', category: 'cafe' }), score: 0.3 },
    { place: makePlace({ id: 'c2', category: 'cafe', lng: -79.381 }), score: 0.3 },
    { place: makePlace({ id: 'c3', category: 'cafe', lng: -79.382 }), score: 0.3 },
    { place: makePlace({ id: 'm1', category: 'museum', lat: 43.7, lng: -79.5 }), score: 0.2 },
    { place: makePlace({ id: 'p1', category: 'park', lat: 43.75, lng: -79.6 }), score: 0.2 },
  ];

  it('prefers category and area spread over three near-identical cafes', () => {
    const picked = selectDiverseCandidates(scored, 3).map((p) => p.category);
    expect(new Set(picked).size).toBe(3);
  });

  it('respects the limit and never returns duplicates', () => {
    const picked = selectDiverseCandidates(scored, 4);
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((p) => p.id)).size).toBe(4);
  });

  it('returns everything when fewer candidates than limit', () => {
    expect(selectDiverseCandidates(scored, 15)).toHaveLength(5);
  });
});
