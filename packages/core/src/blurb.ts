import type { Place } from '@daydrift/types';

export const MAX_BLURB = 140;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Turn model text into a single tidy line: collapse whitespace and newlines, and if it is still too
 * long cut it at a word boundary with an ellipsis. Returns undefined for empty input.
 */
export function oneLiner(text: string | null | undefined, max = MAX_BLURB): string | undefined {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  const trimmed = space > max / 2 ? cut.slice(0, space) : cut;
  return `${trimmed.replace(/[\s,;:-]+$/, '')}…`;
}

/**
 * A description straight from the place's own data, for stops the model did not describe (the
 * fallback itinerary, or stops padded in). Uses the OSM-derived description when it says more than
 * the category, otherwise "Museum in Toronto."
 */
export function placeBlurb(place: Pick<Place, 'description' | 'category' | 'city'>): string {
  const description = place.description?.trim();
  if (description && description.toLowerCase() !== place.category) {
    const text = capitalize(description);
    return /[.!?]$/.test(text) ? text : `${text}.`;
  }
  return `${capitalize(place.category)} in ${capitalize(place.city)}.`;
}
