import { describe, it, expect } from 'vitest';

import { buildItineraryPrompt, buildNarrativePrompt, stopRange } from '../prompt.js';

import { makePlace } from './fixtures.js';

const input = {
  city: 'Toronto',
  interests: ['coffee', 'art'],
  duration: 'half-day' as const,
  travelMode: 'walking' as const,
};

describe('stopRange', () => {
  it('maps durations to stop ranges', () => {
    expect(stopRange('2h')).toEqual({ min: 3, max: 3 });
    expect(stopRange('half-day')).toEqual({ min: 4, max: 5 });
    expect(stopRange('full-day')).toEqual({ min: 5, max: 6 });
  });
});

describe('buildItineraryPrompt', () => {
  const candidates = [makePlace({ id: 'p1', name: 'Coffee House', description: 'Cozy' })];

  it('lists every candidate with its id, name and category', () => {
    const prompt = buildItineraryPrompt(candidates, input);
    expect(prompt).toContain('id: p1');
    expect(prompt).toContain('Coffee House');
    expect(prompt).toContain('category: cafe');
  });

  it('states the stop range and restricts to provided ids', () => {
    const prompt = buildItineraryPrompt(candidates, input);
    expect(prompt).toContain('4-5 stops');
    expect(prompt).toContain('ONLY the candidate places');
    expect(buildItineraryPrompt(candidates, { ...input, duration: '2h' })).toContain('3 stops');
  });
});

describe('buildNarrativePrompt', () => {
  it('orders stops by leg order and resolves names', () => {
    const candidates = [makePlace({ id: 'a', name: 'Alpha' }), makePlace({ id: 'b', name: 'Beta' })];
    const prompt = buildNarrativePrompt(
      {
        title: 'Day Out',
        vibeTags: ['chill'],
        legs: [
          { placeId: 'b', order: 2, rationale: 'r2' },
          { placeId: 'a', order: 1, rationale: 'r1' },
        ],
      },
      candidates,
    );
    expect(prompt.indexOf('Alpha')).toBeLessThan(prompt.indexOf('Beta'));
    expect(prompt).toContain('Day Out');
  });
});
