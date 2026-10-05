import type { CreateTripInput } from '@daydrift/types';

const DURATION_MAP: Record<string, string> = {
  '2h': '2 hours',
  'half-day': 'half day',
  'full-day': 'full day',
};

export function buildSearchQuery(input: CreateTripInput): string {
  const parts: string[] = [];

  // Add interests
  if (input.interests.length > 0) {
    parts.push(input.interests.join(' '));
  }

  // Add city
  parts.push(`in ${input.city.toLowerCase()}`);

  // Add duration context
  const duration = DURATION_MAP[input.duration] || input.duration;
  parts.push(`for ${duration}`);

  // Add travel mode
  parts.push(input.travelMode);

  return parts.join(' ');
}
