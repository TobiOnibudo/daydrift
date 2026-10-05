import { describe, expect, it } from 'vitest';

import { evaluateRetrieval, findRegressions } from '../evals/evaluate-retrieval.js';
import type { RetrievalCase } from '../evals/ground-truth.js';
import { ndcgAtK, precisionAtK, recallAtK, reciprocalRank } from '../evals/metrics.js';

import { makePlace } from './fixtures.js';

describe('ranking metrics', () => {
  const rels = [1, 0, 1, 0, 0];

  it('precision@k is hits over k', () => {
    expect(precisionAtK(rels, 5)).toBeCloseTo(0.4);
    expect(precisionAtK(rels, 1)).toBe(1);
    expect(precisionAtK([], 5)).toBe(0);
  });

  it('recall@k divides by the most relevant items that could fit in k', () => {
    expect(recallAtK(rels, 5, 2)).toBe(1); // found both of 2
    expect(recallAtK(rels, 5, 10)).toBeCloseTo(0.4); // 2 of the 5 that fit
    expect(recallAtK(rels, 5, 0)).toBe(0);
  });

  it('ndcg is 1 for a perfect ranking and penalises late hits', () => {
    expect(ndcgAtK([1, 1, 0], 3, 2)).toBeCloseTo(1);
    // hits at ranks 1 and 3: dcg = 1 + 1/2 = 1.5; ideal = 1 + 1/log2(3) = 1.6309
    expect(ndcgAtK(rels, 5, 2)).toBeCloseTo(1.5 / (1 + 1 / Math.log2(3)), 5);
    expect(ndcgAtK([0, 0], 2, 1)).toBe(0);
  });

  it('reciprocal rank is 1/rank of the first hit', () => {
    expect(reciprocalRank([0, 0, 1])).toBeCloseTo(1 / 3);
    expect(reciprocalRank([0, 0])).toBe(0);
  });
});

describe('evaluateRetrieval', () => {
  const pool = [
    makePlace({ id: '1', category: 'cafe' }),
    makePlace({ id: '2', category: 'cafe' }),
    makePlace({ id: '3', category: 'park' }),
  ];
  const cases: RetrievalCase[] = [
    { id: 'coffee', query: 'coffee', city: 'toronto', isRelevant: (p) => p.category === 'cafe' },
    {
      id: 'museums',
      query: 'museums',
      city: 'toronto',
      isRelevant: (p) => p.category === 'museum',
    },
  ];

  it('scores cases and skips those with nothing relevant in the data', async () => {
    const { summary, results } = await evaluateRetrieval(
      cases,
      async () => [pool[0]!, pool[2]!, pool[1]!],
      async () => pool,
    );

    expect(summary.skipped).toEqual(['museums']);
    expect(summary.cases).toBe(1);
    expect(results[0]).toMatchObject({ id: 'coffee', totalRelevant: 2, mrr: 1 });
    expect(results[0]?.precision[5]).toBeCloseTo(0.4);
    expect(results[0]?.recall[5]).toBe(1);
  });
});

describe('findRegressions', () => {
  const base = {
    cases: 1,
    skipped: [],
    precision: { 5: 0.8, 10: 0.7, 15: 0.6 },
    recall: { 5: 0.8, 10: 0.8, 15: 0.9 },
    ndcg10: 0.8,
    mrr: 0.9,
  };

  it('flags only drops beyond the tolerance', () => {
    const current = { ...base, precision: { ...base.precision, 5: 0.6 }, mrr: 0.88 };
    expect(findRegressions(current, base)).toEqual([
      { metric: 'precision@5', baseline: 0.8, current: 0.6 },
    ]);
  });

  it('reports nothing when metrics hold or improve', () => {
    expect(findRegressions({ ...base, ndcg10: 0.95 }, base)).toEqual([]);
  });
});
