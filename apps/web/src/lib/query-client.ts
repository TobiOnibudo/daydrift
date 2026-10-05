import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { SESSION_KEY } from '../hooks/useAuth';

import { ApiError } from './api';

export const SESSION_EXPIRED_TOAST = 'session-expired';

/**
 * One app-wide Query client. Client errors (4xx) are final and never retried; only network and 5xx
 * failures retry. A 401 from anywhere means the session ended: clear it so the route guard sends
 * the person to sign in (and back afterwards), with one explanatory toast.
 */
export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error) => handleUnauthorized(client, error) }),
    mutationCache: new MutationCache({ onError: (error) => handleUnauthorized(client, error) }),
    defaultOptions: {
      // Reads wait for the connection and resume by themselves (the offline banner explains why).
      // Actions must not: a click that silently queues and fires minutes later is worse than an
      // immediate "check your connection".
      mutations: { networkMode: 'always' },
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
      },
    },
  });
  return client;
}

function handleUnauthorized(client: QueryClient, error: unknown): void {
  if (!(error instanceof ApiError) || error.status !== 401) return;
  // Wrong-password responses are also 401s but belong to the sign-in form, which shows them inline.
  if (error.code === 'INVALID_EMAIL_OR_PASSWORD') return;
  if (client.getQueryData(SESSION_KEY) === null) return;

  client.setQueryData(SESSION_KEY, null);
  toast.error('Your session has expired. Please sign in again.', { id: SESSION_EXPIRED_TOAST });
}
