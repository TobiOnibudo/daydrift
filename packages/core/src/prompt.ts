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

const refOf = (index: number) => `p${index + 1}`;

/**
 * Candidates are shown to the model by short refs (p1, p2, ...) instead of UUIDs: far fewer prompt
 * and output tokens, and nothing long for a small model to mistype. `resolvePlaceRefs` maps back.
 */
export function buildItineraryPrompt(candidates: Place[], input: CreateTripInput): string {
  const range = describeRange(stopRange(input.duration));

  const candidateList = candidates
    .map(
      (p, i) =>
        `- ${refOf(i)}: ${p.name} (${p.category})${p.description ? ` - ${p.description}` : ''}`,
    )
    .join('\n');

  return `You are a local guide planning a ${input.duration} ${input.travelMode} trip in ${input.city}.
Traveler interests: ${input.interests.join(', ') || 'general sightseeing'}.

Choose exactly ${range} using ONLY the candidate places below. Refer to each by its ref (p1, p2, ...) in placeId; never invent refs.
Order the stops so the route flows and suits the travel mode. For each stop give a one-sentence rationale tied to the interests. Add 3-5 short vibe tags.

Candidates:
${candidateList}`;
}

/** Replace the model's refs with real place ids, dropping refs that match no candidate. */
export function resolvePlaceRefs(plan: ItineraryOutput, candidates: Place[]): ItineraryOutput {
  const byRef = new Map(candidates.map((c, i) => [refOf(i), c.id]));
  return {
    ...plan,
    legs: plan.legs.flatMap((leg) => {
      const placeId = byRef.get(leg.placeId.trim().toLowerCase());
      return placeId ? [{ ...leg, placeId }] : [];
    }),
  };
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
