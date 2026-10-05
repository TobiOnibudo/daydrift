import { describe, it, expect } from 'vitest';

import { scoreWithLexicalBoost, TEXT_MATCH_SCORE_BOOST } from '../retrieval/scoring.js';

import { makePlace } from './fixtures.js';

describe('scoreWithLexicalBoost', () => {
  it('preserves vector order when no interest matches', () => {
    const places = [makePlace({ id: 'a' }), makePlace({ id: 'b' }), makePlace({ id: 'c' })];
    const scored = scoreWithLexicalBoost(places, ['zzz']);
    expect(scored.map((s) => s.place.id)).toEqual(['a', 'b', 'c']);
  });

  it('boosts a place per matched interest term', () => {
    const places = [
      makePlace({ id: 'a', name: 'Plain' }),
      makePlace({ id: 'b', name: 'Art Gallery', description: 'modern art' }),
    ];
    const scored = scoreWithLexicalBoost(places, ['art']);
    const b = scored.find((s) => s.place.id === 'b')!;
    const a = scored.find((s) => s.place.id === 'a')!;
    expect(b.score - a.score).toBeCloseTo(TEXT_MATCH_SCORE_BOOST - 0.5, 5);
    expect(b.score).toBeGreaterThan(0.5 + TEXT_MATCH_SCORE_BOOST - 1e-9);
  });

  it('matches interests against tags and category case-insensitively', () => {
    const places = [makePlace({ id: 'a', tags: { cuisine: 'Coffee' } })];
    const s = scoreWithLexicalBoost(places, ['COFFEE'])[0];
    expect(s?.score).toBeCloseTo(1 + TEXT_MATCH_SCORE_BOOST, 5);
  });

  it('returns empty for empty input', () => {
    expect(scoreWithLexicalBoost([], ['x'])).toEqual([]);
  });
});
