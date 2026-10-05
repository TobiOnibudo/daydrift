import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, fetchJson } from './api';

afterEach(() => vi.unstubAllGlobals());

const respond = (status: number, body?: unknown, jsonThrows = false) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: jsonThrows
        ? async () => {
            throw new Error('not json');
          }
        : async () => body,
    }),
  );

describe('fetchJson', () => {
  it('sends the cookie session and a JSON body, and returns parsed JSON', async () => {
    respond(200, { ok: true });
    const result = await fetchJson<{ ok: boolean }>('/trips', { method: 'POST', json: { a: 1 } });

    expect(result).toEqual({ ok: true });
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe('/api/v1/trips');
    expect(init).toMatchObject({ credentials: 'include', method: 'POST', body: '{"a":1}' });
    expect((init!.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('returns undefined for 204 No Content', async () => {
    respond(204);
    expect(await fetchJson('/trips/1', { method: 'DELETE' })).toBeUndefined();
  });

  it('maps the API error envelope to a typed ApiError', async () => {
    respond(400, {
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: { x: 1 } },
    });
    await expect(fetchJson('/trips')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      details: { x: 1 },
    });
  });

  it('understands the Better Auth error shape', async () => {
    respond(401, { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' });
    const error = await fetchJson('/auth/sign-in/email').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' });
  });

  it('falls back to a status message for non-JSON error bodies', async () => {
    respond(502, undefined, true);
    await expect(fetchJson('/trips')).rejects.toMatchObject({
      status: 502,
      message: 'Request failed (502)',
    });
  });
});
