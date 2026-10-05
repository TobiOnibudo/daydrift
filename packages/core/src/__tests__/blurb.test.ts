import { describe, expect, it } from 'vitest';

import { MAX_BLURB, oneLiner, placeBlurb } from '../blurb.js';
import { buildFallbackItinerary, normalizeItineraryLegs } from '../itinerary.js';

import { makePlace } from './fixtures.js';

describe('oneLiner', () => {
  it('returns nothing for empty input', () => {
    expect(oneLiner(undefined)).toBeUndefined();
    expect(oneLiner('   \n ')).toBeUndefined();
  });

  it('collapses newlines and runs of whitespace into a single line', () => {
    expect(oneLiner('  A quiet\n\n  cafe   with\tgreat   light. ')).toBe(
      'A quiet cafe with great light.',
    );
  });

  it('leaves text within the limit untouched', () => {
    const text = 'x'.repeat(MAX_BLURB);
    expect(oneLiner(text)).toBe(text);
  });

  it('cuts long text at a word boundary and marks it, never exceeding the limit', () => {
    const long = 'A sprawling harbourfront market with far too many stalls to list here '.repeat(6);
    const result = oneLiner(long) as string;
    expect(result.length).toBeLessThanOrEqual(MAX_BLURB);
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toMatch(/\s…$/);
    expect(long.startsWith(result.slice(0, -1))).toBe(true);
  });

  it('does not split on abbreviations such as "St."', () => {
    expect(oneLiner('Browse St. Lawrence Market for peameal bacon.')).toBe(
      'Browse St. Lawrence Market for peameal bacon.',
    );
  });
});

describe('placeBlurb', () => {
  const base = { city: 'toronto', category: 'museum' } as const;

  it('uses a descriptive OSM description, capitalised and ending with a full stop', () => {
    expect(placeBlurb({ ...base, description: 'pizza restaurant' })).toBe('Pizza restaurant.');
    expect(placeBlurb({ ...base, description: 'Already a sentence!' })).toBe('Already a sentence!');
  });

  it('falls back to "<Category> in <City>." when the description just repeats the category', () => {
    expect(placeBlurb({ ...base, description: 'museum' })).toBe('Museum in Toronto.');
    expect(placeBlurb({ ...base, description: null })).toBe('Museum in Toronto.');
  });
});

describe('every itinerary stop carries a one-line description and a category', () => {
  const candidates = [
    makePlace({ id: 'a', name: 'A', category: 'museum', description: 'art museum' }),
    makePlace({ id: 'b', name: 'B', category: 'park', description: null }),
    makePlace({ id: 'c', name: 'C', category: 'cafe', description: 'coffee shop' }),
  ];

  it("uses the model's sentence when given, trimmed to one line", () => {
    const [leg] = normalizeItineraryLegs(
      [{ placeId: 'a', order: 1, rationale: 'Great\nmodern art.' }],
      candidates,
      1,
    );
    expect(leg).toMatchObject({ note: 'Great modern art.', category: 'museum' });
  });

  it('describes stops the model left blank, including ones padded in to reach the minimum', () => {
    const legs = normalizeItineraryLegs([{ placeId: 'a', order: 1 }], candidates, 3);
    expect(legs.map((l) => l.note)).toEqual(['Art museum.', 'Park in Toronto.', 'Coffee shop.']);
    expect(legs.map((l) => l.category)).toEqual(['museum', 'park', 'cafe']);
  });

  it('describes every stop of the fallback itinerary too', () => {
    const legs = buildFallbackItinerary(candidates, 3, 3);
    expect(legs.every((l) => typeof l.note === 'string' && l.note.length > 0)).toBe(true);
    expect(legs.every((l) => l.category !== undefined)).toBe(true);
  });
});
