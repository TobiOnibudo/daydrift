import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchJson } from '../lib/api';
import type { SessionUser } from '../lib/types';

export const SESSION_KEY = ['session'] as const;

interface SessionResponse {
  user: SessionUser;
}

/** The signed-in user, or null. Better Auth answers 200 with a null body when signed out. */
export function useSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: async () => {
      const result = await fetchJson<SessionResponse | null>('/auth/get-session');
      return result?.user ?? null;
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

interface Credentials {
  email: string;
  password: string;
}

function useAuthMutation<V>(path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: V) => fetchJson<unknown>(path, { method: 'POST', json: values }),
    onSuccess: async () => {
      // Drop any data cached for a previous user before loading the new session.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'cities' });
      await queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    },
  });
}

export const useSignIn = () => useAuthMutation<Credentials>('/auth/sign-in/email');

export const useSignUp = () =>
  useAuthMutation<Credentials & { name: string }>('/auth/sign-up/email');

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchJson<unknown>('/auth/sign-out', { method: 'POST', json: {} }),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(SESSION_KEY, null);
    },
  });
}
