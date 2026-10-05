import type { Place } from '@daydrift/types';

import type { ScoredPlace } from './scoring.js';

const CATEGORY_PENALTY = 0.15;
const AREA_PENALTY = 0.1;
const AREA_BUCKET_DEG = 0.01; // ~1km

const areaKey = (p: Place) =>
  `${Math.floor(p.lat / AREA_BUCKET_DEG)},${Math.floor(p.lng / AREA_BUCKET_DEG)}`;

/** Greedy pick: each round takes the best score after penalising repeated categories/areas. */
export function selectDiverseCandidates(scored: ScoredPlace[], limit = 15): Place[] {
  const remaining = [...scored];
  const selected: Place[] = [];
  const categoryCounts = new Map<string, number>();
  const areaCounts = new Map<string, number>();

  while (selected.length < limit && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    remaining.forEach(({ place, score }, idx) => {
      const adjusted =
        score -
        (categoryCounts.get(place.category) ?? 0) * CATEGORY_PENALTY -
        (areaCounts.get(areaKey(place)) ?? 0) * AREA_PENALTY;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestIdx = idx;
      }
    });

    const picked = remaining.splice(bestIdx, 1)[0];
    if (!picked) break;
    const { place } = picked;
    selected.push(place);
    categoryCounts.set(place.category, (categoryCounts.get(place.category) ?? 0) + 1);
    areaCounts.set(areaKey(place), (areaCounts.get(areaKey(place)) ?? 0) + 1);
  }

  return selected;
}
