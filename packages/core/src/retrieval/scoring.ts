import type { Place } from '@daydrift/types';

export const TEXT_MATCH_SCORE_BOOST = 0.1;

export interface ScoredPlace {
  place: Place;
  score: number;
}

/**
 * Score vector-ordered places: base score falls linearly with vector rank
 * (1 for the closest match), plus a lexical boost per matched interest term.
 */
export function scoreWithLexicalBoost(vectorOrdered: Place[], interests: string[]): ScoredPlace[] {
  const terms = interests.map((i) => i.trim().toLowerCase()).filter(Boolean);
  const total = vectorOrdered.length;

  return vectorOrdered
    .map((place, rank) => {
      const haystack = [
        place.name,
        place.description ?? '',
        place.category,
        ...Object.values(place.tags ?? {}).map(String),
      ]
        .join(' ')
        .toLowerCase();

      const matches = terms.filter((t) => haystack.includes(t)).length;
      const base = total > 0 ? 1 - rank / total : 0;

      return { place, score: base + matches * TEXT_MATCH_SCORE_BOOST };
    })
    .sort((a, b) => b.score - a.score);
}
