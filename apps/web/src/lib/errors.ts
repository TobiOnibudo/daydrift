import { ApiError } from './api';

export interface DescribedError {
  /** One clear, user-facing sentence. Never a stack trace, status code, or raw server text. */
  message: string;
  /** Problems attributable to specific form fields. */
  fieldErrors: Record<string, string>;
  kind:
    | 'network'
    | 'session'
    | 'validation'
    | 'conflict'
    | 'rate-limit'
    | 'unavailable'
    | 'server'
    | 'not-found'
    | 'unknown';
}

const FIELD_MESSAGES: Record<string, string> = {
  email: 'Enter a valid email address.',
  password: 'Use at least 8 characters.',
  name: 'Enter your name.',
  city: 'Choose a city.',
  interests: 'Check your interests and try again.',
  duration: 'Choose how long you have.',
  travelMode: 'Choose how you are getting around.',
};

/** Better Auth reports validation as "[body.email] Invalid email address". */
function fieldFromMessage(message: string): string | null {
  return /^\[body\.(\w+)\]/.exec(message)?.[1] ?? null;
}

/** First message per field from our API's `details.fieldErrors`. */
function fieldErrorsFromDetails(details: unknown): Record<string, string> {
  const raw = (details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors;
  if (!raw) return {};
  return Object.fromEntries(
    Object.entries(raw).map(([field, messages]) => [
      field,
      FIELD_MESSAGES[field] ?? messages[0] ?? 'Invalid value.',
    ]),
  );
}

const make = (
  kind: DescribedError['kind'],
  message: string,
  fieldErrors: Record<string, string> = {},
): DescribedError => ({ kind, message, fieldErrors });

/** Turn any thrown value into something safe and helpful to show. */
export function describeError(error: unknown): DescribedError {
  if (!(error instanceof ApiError)) {
    // fetch() rejects with a TypeError when the network is down or the server is unreachable.
    return make(
      'network',
      "We can't reach Daydrift right now. Check your connection and try again.",
    );
  }

  const { status, code, message, details } = error;

  if (code?.startsWith('USER_ALREADY_EXISTS')) {
    return make('conflict', 'An account with this email already exists. Try signing in instead.', {
      email: 'An account with this email already exists.',
    });
  }
  if (code === 'INVALID_EMAIL_OR_PASSWORD') {
    return make('validation', 'That email and password do not match.');
  }
  if (code === 'PASSWORD_TOO_SHORT') {
    return make('validation', 'Your password is too short.', {
      password: 'Use at least 8 characters.',
    });
  }
  if (code === 'PASSWORD_TOO_LONG') {
    return make('validation', 'Your password is too long.', {
      password: 'Use at most 128 characters.',
    });
  }

  if (status === 400 || status === 422) {
    const fieldErrors = fieldErrorsFromDetails(details);
    const authField = fieldFromMessage(message);
    if (authField) fieldErrors[authField] = FIELD_MESSAGES[authField] ?? 'Invalid value.';
    if (Object.keys(fieldErrors).length > 0) {
      return make('validation', 'Please fix the highlighted fields and try again.', fieldErrors);
    }
    return make(
      'validation',
      'Some of that information is not valid. Please check it and try again.',
    );
  }
  if (status === 401) return make('session', 'Your session has expired. Please sign in again.');
  if (status === 404) return make('not-found', "We couldn't find that. It may have been removed.");
  if (status === 409) return make('conflict', message);
  if (status === 429)
    return make('rate-limit', "You're going a little fast. Please wait a minute and try again.");
  if (status === 503) {
    return make('unavailable', 'This is temporarily unavailable. Please try again in a moment.');
  }
  if (status >= 500) return make('server', 'Something went wrong on our side. Please try again.');
  return make('unknown', 'Something went wrong. Please try again.');
}
