import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { semanticSearchPlaces } from '../retrieval/semantic.js';
import { loadCityPool } from '../retrieval/vector-search.js';

import {
  findRegressions,
  evaluateRetrieval,
  type EvalReport,
  type EvalSummary,
} from './evaluate-retrieval.js';
import { retrievalGroundTruth } from './ground-truth.js';

// Runs the retrieval evals against the seeded database:
//   pnpm eval                    compare to evals/baseline.json, exit 1 on regression
//   pnpm eval --update-baseline  record the current summary as the new baseline

const EVALS_DIR = join(process.cwd(), 'evals');
const BASELINE = join(EVALS_DIR, 'baseline.json');
const K = 15;

const report: EvalReport = await evaluateRetrieval(
  retrievalGroundTruth,
  (c) => semanticSearchPlaces(c.query, c.city, K),
  loadCityPool,
);

console.table(
  report.results.map((r) => ({
    case: r.id,
    relevant: r.totalRelevant,
    'P@5': r.precision[5],
    'P@10': r.precision[10],
    'R@10': r.recall[10],
    'NDCG@10': r.ndcg10,
    MRR: r.mrr,
  })),
);
console.log('Summary:', report.summary);
if (report.summary.skipped.length > 0) {
  console.warn(`Skipped (no relevant places seeded): ${report.summary.skipped.join(', ')}`);
}

mkdirSync(join(EVALS_DIR, 'results'), { recursive: true });
const file = join(EVALS_DIR, 'results', `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
writeFileSync(file, JSON.stringify(report, null, 2));
console.log(`Wrote ${file}`);

if (report.summary.cases === 0) {
  console.error('No evaluable cases: seed a city and run the embedding worker first.');
  process.exit(1);
}

if (process.argv.includes('--update-baseline')) {
  writeFileSync(BASELINE, JSON.stringify(report.summary, null, 2) + '\n');
  console.log(`Baseline updated: ${BASELINE}`);
} else if (!existsSync(BASELINE)) {
  console.warn('No baseline yet. Re-run with --update-baseline to record one.');
} else {
  const regressions = findRegressions(
    report.summary,
    JSON.parse(readFileSync(BASELINE, 'utf8')) as EvalSummary,
  );
  if (regressions.length > 0) {
    console.error('Retrieval regressed vs baseline:', regressions);
    process.exit(1);
  }
  console.log('No regressions vs baseline.');
}
process.exit(0);
