import autocannon from 'autocannon';

import { BASE_URL } from './env';
import globalSetup from './global-setup';

// Load test against the hermetic stack (real Postgres + Redis, mock AI), so it measures Daydrift's
// own overhead: routing, auth, queries, caching, and the queue. Run with `pnpm load`.
const DURATION = Number(process.env.LOAD_SECONDS ?? 8);
const CONNECTIONS = Number(process.env.LOAD_CONNECTIONS ?? 40);

const teardown = await globalSetup();
const rows: Array<Record<string, string | number>> = [];
let failed = false;

async function session(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
    body: JSON.stringify({
      email: `load-${Date.now()}@example.com`,
      password: 'load-test-password',
      name: 'Load',
    }),
  });
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  if (!res.ok || !cookie) throw new Error(`Could not create a load-test session (${res.status})`);
  return cookie;
}

async function scenario(name: string, options: Partial<autocannon.Options> & { url: string }) {
  const result = await autocannon({ connections: CONNECTIONS, duration: DURATION, ...options });
  const bad = result.non2xx + result.errors + result.timeouts;
  if (bad > 0) failed = true;
  rows.push({
    scenario: name,
    'req/s': Math.round(result.requests.average),
    'p50 ms': result.latency.p50,
    'p99 ms': result.latency.p99,
    'max ms': result.latency.max,
    'non-2xx/errors': bad,
  });
}

try {
  const cookie = await session();
  const json = { 'Content-Type': 'application/json', Cookie: cookie };

  await scenario('GET /health (baseline)', { url: `${BASE_URL}/health` });
  await scenario('GET /places/cities (DB group-by)', { url: `${BASE_URL}/api/v1/places/cities` });
  await scenario('GET /places?city= (DB list)', { url: `${BASE_URL}/api/v1/places?city=toronto` });
  await scenario('GET /trips (authenticated)', {
    url: `${BASE_URL}/api/v1/trips`,
    headers: { Cookie: cookie },
  });
  await scenario('GET / (SPA shell)', { url: `${BASE_URL}/` });

  // Prime the result cache once, then hammer the identical request: every hit should be served
  // from Redis without touching the worker.
  const body = JSON.stringify({
    city: 'toronto',
    interests: ['art'],
    duration: '2h',
    travelMode: 'walking',
  });
  const prime = await fetch(`${BASE_URL}/api/v1/trips`, { method: 'POST', headers: json, body });
  const { tripId } = (await prime.json()) as { tripId: string };
  for (let i = 0; i < 60; i++) {
    const status = (await (
      await fetch(`${BASE_URL}/api/v1/trips/${tripId}/status`, { headers: json })
    ).json()) as {
      status: string;
    };
    if (status.status === 'complete') break;
    await new Promise((r) => setTimeout(r, 250));
  }
  await scenario('POST /trips (cache hit)', {
    url: `${BASE_URL}/api/v1/trips`,
    method: 'POST',
    headers: json,
    body,
  });

  // Full pipeline throughput: distinct trips force real generation through the queue and worker.
  const started = Date.now();
  const N = 25;
  const latencies = await Promise.all(
    Array.from({ length: N }, async (_, i) => {
      const t0 = Date.now();
      const res = await fetch(`${BASE_URL}/api/v1/trips`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({
          city: 'toronto',
          interests: [`load-${i}`],
          duration: '2h',
          travelMode: 'walking',
        }),
      });
      const { tripId: id } = (await res.json()) as { tripId: string };
      for (;;) {
        const s = (await (
          await fetch(`${BASE_URL}/api/v1/trips/${id}/status`, { headers: json })
        ).json()) as {
          status: string;
        };
        if (s.status === 'complete' || s.status === 'failed')
          return { ms: Date.now() - t0, ok: s.status === 'complete' };
        if (Date.now() - t0 > 60_000) return { ms: Date.now() - t0, ok: false };
        await new Promise((r) => setTimeout(r, 200));
      }
    }),
  );
  const sorted = latencies.map((l) => l.ms).sort((a, b) => a - b);
  const pct = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] as number;
  const notOk = latencies.filter((l) => !l.ok).length;
  if (notOk > 0) failed = true;
  rows.push({
    scenario: `${N} concurrent full generations (queue + worker)`,
    'req/s': Math.round((N / (Date.now() - started)) * 1000 * 10) / 10,
    'p50 ms': pct(50),
    'p99 ms': pct(99),
    'max ms': sorted.at(-1) as number,
    'non-2xx/errors': notOk,
  });

  console.table(rows);
  console.log(
    failed ? 'FAILED: some requests errored or were non-2xx.' : 'All requests succeeded.',
  );
} finally {
  await teardown();
}
process.exit(failed ? 1 : 0);
