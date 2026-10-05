import type { Place } from '@daydrift/types';

import type { RetrievalCase } from './ground-truth.js';
import { ndcgAtK, precisionAtK, recallAtK, reciprocalRank } from './metrics.js';

export const EVAL_KS = [5, 10, 15] as const;

export interface CaseResult {
  id: string;
  totalRelevant: number;
  precision: Record<number, number>;
  recall: Record<number, number>;
  ndcg10: number;
  mrr: number;
}

export interface EvalSummary {
  cases: number;
  skipped: string[];
  precision: Record<number, number>;
  recall: Record<number, number>;
  ndcg10: number;
  mrr: number;
}

export interface EvalReport {
  summary: EvalSummary;
  results: CaseResult[];
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Score a retriever against the ground truth. `retrieve` returns ranked places for a case;
 * `cityPool` returns every place in a city, used to count how many are truly relevant.
 * Cases with no relevant places in the data are skipped (they measure the seed, not retrieval).
 */
export async function evaluateRetrieval(
  cases: RetrievalCase[],
  retrieve: (c: RetrievalCase) => Promise<Place[]>,
  cityPool: (city: string) => Promise<Place[]>,
): Promise<EvalReport> {
  const results: CaseResult[] = [];
  const skipped: string[] = [];

  for (const c of cases) {
    const totalRelevant = (await cityPool(c.city)).filter(c.isRelevant).length;
    if (totalRelevant === 0) {
      skipped.push(c.id);
      continue;
    }
    const rels = (await retrieve(c)).map((p) => (c.isRelevant(p) ? 1 : 0));
    results.push({
      id: c.id,
      totalRelevant,
      precision: Object.fromEntries(EVAL_KS.map((k) => [k, round(precisionAtK(rels, k))])),
      recall: Object.fromEntries(EVAL_KS.map((k) => [k, round(recallAtK(rels, k, totalRelevant))])),
      ndcg10: round(ndcgAtK(rels, 10, totalRelevant)),
      mrr: round(reciprocalRank(rels)),
    });
  }

  const avg = (pick: (r: CaseResult) => number) => round(mean(results.map(pick)));
  return {
    results,
    summary: {
      cases: results.length,
      skipped,
      precision: Object.fromEntries(EVAL_KS.map((k) => [k, avg((r) => r.precision[k] ?? 0)])),
      recall: Object.fromEntries(EVAL_KS.map((k) => [k, avg((r) => r.recall[k] ?? 0)])),
      ndcg10: avg((r) => r.ndcg10),
      mrr: avg((r) => r.mrr),
    },
  };
}

export interface Regression {
  metric: string;
  baseline: number;
  current: number;
}

/** Metrics that dropped by more than `tolerance` versus the baseline. */
export function findRegressions(
  current: EvalSummary,
  baseline: EvalSummary,
  tolerance = 0.05,
): Regression[] {
  const pairs: Array<[string, number, number]> = [
    ...EVAL_KS.map((k): [string, number, number] => [
      `precision@${k}`,
      baseline.precision[k] ?? 0,
      current.precision[k] ?? 0,
    ]),
    ...EVAL_KS.map((k): [string, number, number] => [
      `recall@${k}`,
      baseline.recall[k] ?? 0,
      current.recall[k] ?? 0,
    ]),
    ['ndcg@10', baseline.ndcg10, current.ndcg10],
    ['mrr', baseline.mrr, current.mrr],
  ];
  return pairs
    .filter(([, base, cur]) => cur < base - tolerance)
    .map(([metric, base, cur]) => ({ metric, baseline: base, current: cur }));
}
