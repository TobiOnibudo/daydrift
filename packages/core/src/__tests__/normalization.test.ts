import { describe, expect, it } from 'vitest';

import { hashInput, normalizeInput } from '../normalization.js';

const base = {
  city: 'Toronto',
  interests: ['Coffee', 'art'],
  duration: 'half-day' as const,
  travelMode: 'walking' as const,
};

describe('normalizeInput', () => {
  it('lowercases, trims, dedupes and sorts interests', () => {
    const n = normalizeInput({
      ...base,
      city: '  TORONTO ',
      interests: ['Art ', 'coffee', 'ART', ' '],
    });
    expect(n.city).toBe('toronto');
    expect(n.interests).toEqual(['art', 'coffee']);
  });
});

describe('hashInput', () => {
  it('is stable across interest order, casing and whitespace', () => {
    const a = hashInput(base);
    const b = hashInput({ ...base, city: ' toronto', interests: ['ART', 'coffee '] });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when any meaningful field changes', () => {
    const h = hashInput(base);
    expect(hashInput({ ...base, city: 'Montreal' })).not.toBe(h);
    expect(hashInput({ ...base, interests: ['art'] })).not.toBe(h);
    expect(hashInput({ ...base, duration: 'full-day' })).not.toBe(h);
    expect(hashInput({ ...base, travelMode: 'cycling' })).not.toBe(h);
  });
});
