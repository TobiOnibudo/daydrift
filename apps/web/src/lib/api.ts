// The ONLY module that touches `fetch` (docs/05 §2). Components call TanStack Query hooks,
// which call this. Requests are same-origin by default (Vite proxies /api in dev; the API serves
// the SPA in production), so the HttpOnly session cookie just works. Set VITE_API_URL only when
// the API lives on a different origin.

const ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const API_BASE = `${ORIGIN}/api/v1`;

/** Thrown on non-2xx responses so Query surfaces typed failures. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  /** Serialized and sent as application/json. */
  json?: unknown;
}

interface ErrorBody {
  // Our envelope: { error: { code, message, details } }. Better Auth uses { code, message }.
  error?: { code?: string; message?: string; details?: unknown };
  code?: string;
  message?: string;
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Non-JSON error body (e.g. a proxy error page): fall through to the status text.
  }
  const message = body.error?.message ?? body.message ?? `Request failed (${response.status})`;
  return new ApiError(response.status, message, body.error?.code ?? body.code, body.error?.details);
}

/** Fetch JSON from the API with the cookie session. Throws {@link ApiError} on non-2xx. */
export async function fetchJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  if (json !== undefined) finalHeaders.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: finalHeaders,
    ...rest,
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
