// Thin fetch wrapper — the ONLY place in the app that touches `fetch`
// (see docs/05-frontend.md §2). Components call TanStack Query hooks, which
// call this; they never fetch directly.

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

// --- Token store ---------------------------------------------------------
// Cookie session is primary (credentials: 'include'). In the cross-origin
// case where cookies are unavailable we fall back to an Authorization Bearer
// token kept in this tiny module-local store.
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

/** Error thrown on non-2xx responses so Query surfaces typed failures. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface FetchOptions extends RequestInit {
  /** Parsed JSON body; serialized and sent as application/json. */
  json?: unknown;
}

/**
 * Fetch JSON from the API. Sends the cookie session and, when present, an
 * Authorization Bearer fallback. Throws {@link ApiError} on non-2xx.
 */
export async function fetchJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  if (json !== undefined) {
    finalHeaders.set('Content-Type', 'application/json');
  }
  const token = getAuthToken();
  if (token) {
    finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: finalHeaders,
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    ...rest,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed: ${response.status}`);
  }

  // 204 No Content and empty bodies return undefined.
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
