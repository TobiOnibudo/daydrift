import type { z } from 'zod';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL';

export interface ErrorEnvelope {
  error: { code: ErrorCode; message: string; details?: unknown };
}

/** Build the standard { error: { code, message, details? } } envelope (docs/04 §2). */
export function errorEnvelope(code: ErrorCode, message: string, details?: unknown): ErrorEnvelope {
  return details === undefined
    ? { error: { code, message } }
    : { error: { code, message, details } };
}

/** An error that maps directly to an HTTP status and envelope code. */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static notFound(what: string): AppError {
    return new AppError(404, 'NOT_FOUND', `${what} not found`);
  }

  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }
}

/** Validate `data` with a Zod schema, throwing a VALIDATION_ERROR with per-field details. */
export function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request', result.error.flatten());
  }
  return result.data as z.output<S>;
}
