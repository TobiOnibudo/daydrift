import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@daydrift/auth', () => ({
  auth: { api: { getSession: vi.fn() }, handler: vi.fn() },
  fromNodeHeaders: (h: unknown) => h,
}));

const { buildApp } = await import('../app.js');

const queue = { add: vi.fn(), close: vi.fn(async () => undefined) };
let app: Awaited<ReturnType<typeof buildApp>>;

beforeEach(async () => {
  const dist = mkdtempSync(join(tmpdir(), 'daydrift-web-'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Daydrift</title>');
  writeFileSync(join(dist, 'assets', 'app-abc123.js'), 'console.log(1)');
  app = await buildApp({ aiPlanQueue: queue, logger: false, webDist: dist });
});
afterEach(() => app.close());

describe('serving the built SPA', () => {
  it('serves index.html at / without caching', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<title>Daydrift</title>');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('caches hashed assets immutably', async () => {
    const res = await app.inject({ method: 'GET', url: '/assets/app-abc123.js' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toContain('immutable');
  });

  it('falls back to the SPA for client-side routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/trips/7d4b8a3e' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<title>Daydrift</title>');
  });

  it('keeps API misses and missing assets as JSON 404s', async () => {
    const api = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(api.statusCode).toBe(404);
    expect(api.json().error.code).toBe('NOT_FOUND');

    const asset = await app.inject({ method: 'GET', url: '/assets/missing.js' });
    expect(asset.statusCode).toBe(404);
    expect(asset.json().error.code).toBe('NOT_FOUND');
  });

  it('does not serve the SPA when no build exists', async () => {
    const bare = await buildApp({ aiPlanQueue: queue, logger: false, webDist: false });
    const res = await bare.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(404);
    await bare.close();
  });
});
