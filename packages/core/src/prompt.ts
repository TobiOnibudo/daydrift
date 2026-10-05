import type { CreateTripInput, Duration, Place } from '@daydrift/types';

import type { ItineraryOutput } from './schemas.js';

/** Duration-derived stop range (docs/03 §5). */
export function stopRange(duration: Duration): { min: number; max: number } {
  switch (duration) {
    case '2h':
      return { min: 3, max: 3 };
    case 'half-day':
      return { min: 4, max: 5 };
    case 'full-day':
      return { min: 5, max: 6 };
  }
}

const describeRange = (r: { min: number; max: number }) =>
  r.min === r.max ? `${r.min} stops` : `${r.min}-${r.max} stops`;

export function buildItineraryPrompt(candidates: Place[], input: CreateTripInput): string {
  const range = describeRange(stopRange(input.duration));

  const candidateList = candidates
    .map(
      (p) =>
        `- id: ${p.id}\n  name: ${p.name}\n  category: ${p.category}\n  description: ${p.description ?? 'n/a'}\n  coords: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
    )
    .join('\n');

  return `You are a local guide planning a ${input.duration} ${input.travelMode} trip in ${input.city}.
Traveler interests: ${input.interests.join(', ') || 'general sightseeing'}.

Choose exactly ${range} using ONLY the candidate places below (reference them by their id, never invent ids).
Order the stops so the route flows geographically and suits the travel mode. For each stop give a one-sentence rationale tied to the interests. Add 3-5 short vibe tags.

Candidates:
${candidateList}`;
}

export function buildNarrativePrompt(itinerary: ItineraryOutput, candidates: Place[]): string {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const stops = [...itinerary.legs]
    .sort((a, b) => a.order - b.order)
    .map((l) => `${l.order}. ${byId.get(l.placeId)?.name ?? 'a local spot'} - ${l.rationale}`)
    .join('\n');

  return `Write a warm, concise (2-3 short paragraphs) narrative introducing this itinerary titled "${itinerary.title}" (${itinerary.vibeTags.join(', ')}). Walk through the stops in order without a bulleted list.

Stops:
${stops}`;
}
