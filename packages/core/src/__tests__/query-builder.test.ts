import { describe, it, expect } from 'vitest';

import { buildSearchQuery } from '../retrieval/query-builder.js';

describe('buildSearchQuery', () => {
  it('combines city, interests, duration, and mode into query string', () => {
    const query = buildSearchQuery({
      city: 'Toronto',
      interests: ['coffee', 'art', 'museums'],
      duration: 'half-day',
      travelMode: 'walking',
    });

    expect(query).toContain('toronto');
    expect(query).toContain('coffee');
    expect(query).toContain('art');
    expect(query).toContain('museums');
    expect(query).toContain('half day');
    expect(query).toContain('walking');
  });

  it('handles empty interests', () => {
    const query = buildSearchQuery({
      city: 'Toronto',
      interests: [],
      duration: '2h',
      travelMode: 'cycling',
    });

    expect(query).toContain('toronto');
    expect(query).toContain('2 hours');
  });
});
