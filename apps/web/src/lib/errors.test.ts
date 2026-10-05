import { describe, expect, it } from 'vitest';

import { ApiError } from './api';
import { describeError } from './errors';

const api = (status: number, message = 'raw server text', code?: string, details?: unknown) =>
  new ApiError(status, message, code, details);

describe('describeError', () => {
  it('treats non-API errors (a failed fetch) as a connectivity problem', () => {
    const result = describeError(new TypeError('Failed to fetch'));
    expect(result.kind).toBe('network');
    expect(result.message).toMatch(/check your connection/i);
  });

  it('maps a duplicate account to the email field with a path forward', () => {
    const result = describeError(
      api(422, 'User already exists.', 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'),
    );
    expect(result.kind).toBe('conflict');
    expect(result.fieldErrors.email).toMatch(/already exists/i);
    expect(result.message).toMatch(/try signing in/i);
  });

  it('explains a wrong password without revealing which half was wrong', () => {
    const result = describeError(api(401, 'x', 'INVALID_EMAIL_OR_PASSWORD'));
    expect(result.message).toBe('That email and password do not match.');
    expect(result.fieldErrors).toEqual({});
  });

  it('maps Better Auth validation ("[body.email] ...") to the right field', () => {
    const result = describeError(
      api(400, '[body.email] Invalid email address', 'VALIDATION_ERROR'),
    );
    expect(result.fieldErrors).toEqual({ email: 'Enter a valid email address.' });
  });

  it('maps our API field errors to friendly per-field messages', () => {
    const result = describeError(
      api(400, 'Invalid request', 'VALIDATION_ERROR', {
        fieldErrors: {
          city: ['String must contain at least 1 character(s)'],
          duration: ['Invalid enum value'],
        },
      }),
    );
    expect(result.kind).toBe('validation');
    expect(result.fieldErrors).toEqual({
      city: 'Choose a city.',
      duration: 'Choose how long you have.',
    });
    expect(result.message).toMatch(/highlighted fields/i);
  });

  it('falls back to a generic validation message when no field is identifiable', () => {
    const result = describeError(api(400, 'Invalid request', 'VALIDATION_ERROR'));
    expect(result.fieldErrors).toEqual({});
    expect(result.message).toMatch(/not valid/i);
  });

  it.each([
    [401, 'session', /session has expired/i],
    [404, 'not-found', /couldn't find that/i],
    [429, 'rate-limit', /wait a minute/i],
    [503, 'unavailable', /temporarily unavailable/i],
    [500, 'server', /our side/i],
    [502, 'server', /our side/i],
  ] as const)('maps HTTP %i to a %s message', (status, kind, pattern) => {
    const result = describeError(api(status));
    expect(result.kind).toBe(kind);
    expect(result.message).toMatch(pattern);
  });

  it('never leaks raw server text for server errors', () => {
    expect(
      describeError(api(500, 'ECONNREFUSED 10.0.0.5:5432 stack trace...')).message,
    ).not.toMatch(/ECONNREFUSED/);
  });
});
