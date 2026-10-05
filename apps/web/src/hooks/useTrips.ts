import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchJson } from '../lib/api';
import type {
  ApiPlace,
  ApiTrip,
  CitySummary,
  CreateTripPayload,
  SharedApiTrip,
} from '../lib/types';

// All server state lives here (docs/05 §2). Cache keys: ['trips'], ['trip', id],
// ['shared', token], ['cities'].

export const tripKey = (id: string) => ['trip', id] as const;

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async () => (await fetchJson<{ cities: CitySummary[] }>('/places/cities')).cities,
    staleTime: 10 * 60_000,
  });
}

export function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: async () => (await fetchJson<{ trips: ApiTrip[] }>('/trips')).trips,
  });
}

export function useTrip(tripId: string) {
  return useQuery({
    queryKey: tripKey(tripId),
    queryFn: async () => (await fetchJson<{ trip: ApiTrip }>(`/trips/${tripId}`)).trip,
    enabled: Boolean(tripId),
  });
}

/** A trip opened through a public share link (no session needed). */
export function useSharedTrip(token: string) {
  return useQuery({
    queryKey: ['shared', token],
    queryFn: async () => (await fetchJson<{ trip: SharedApiTrip }>(`/shared/${token}`)).trip,
    enabled: Boolean(token),
    retry: false,
  });
}

interface CreatedTrip {
  tripId: string;
  status: ApiTrip['status'];
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripPayload) =>
      fetchJson<CreatedTrip>('/trips', { method: 'POST', json: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips'] }),
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => fetchJson<void>(`/trips/${tripId}`, { method: 'DELETE' }),
    onSuccess: (_data, tripId) => {
      queryClient.removeQueries({ queryKey: tripKey(tripId) });
      return queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useRegenerateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) =>
      fetchJson<CreatedTrip>(`/trips/${tripId}/regenerate`, { method: 'POST' }),
    onSuccess: (_data, tripId) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: tripKey(tripId) }),
        queryClient.invalidateQueries({ queryKey: ['trips'] }),
      ]),
  });
}

/** Turn a public share link on (returns the token) or off. */
export function useShareTrip(tripId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: tripKey(tripId) });
  const enable = useMutation({
    mutationFn: async () =>
      (await fetchJson<{ shareToken: string }>(`/trips/${tripId}/share`, { method: 'POST' }))
        .shareToken,
    onSuccess: invalidate,
  });
  const disable = useMutation({
    mutationFn: () => fetchJson<void>(`/trips/${tripId}/share`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  return { enable, disable };
}

/**
 * Save a new ordered list of stops. Reorders and removals show instantly and roll back if the
 * server refuses; additions wait for the server, which supplies the new stop's details.
 */
export function useUpdateStops(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (placeIds: string[]) =>
      (
        await fetchJson<{ trip: ApiTrip }>(`/trips/${tripId}/stops`, {
          method: 'PATCH',
          json: { placeIds },
        })
      ).trip,
    onMutate: async (placeIds) => {
      await queryClient.cancelQueries({ queryKey: tripKey(tripId) });
      const previous = queryClient.getQueryData<ApiTrip>(tripKey(tripId));
      if (previous) {
        const known = new Map(previous.legs.map((leg) => [leg.placeId, leg]));
        const legs = placeIds.flatMap((id, index) => {
          const leg = known.get(id);
          return leg ? [{ ...leg, order: index + 1 }] : [];
        });
        if (legs.length === placeIds.length) {
          queryClient.setQueryData(tripKey(tripId), { ...previous, legs });
        }
      }
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(tripKey(tripId), context.previous);
    },
    onSuccess: (trip) => queryClient.setQueryData(tripKey(tripId), trip),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['trips'] }),
  });
}

/** Places that could be added to a trip: matches for a search, or picks for the trip's interests. */
export function useSuggestions(tripId: string, query: string, enabled = true) {
  return useQuery({
    queryKey: ['suggestions', tripId, query],
    queryFn: async () => {
      const q = query ? `?q=${encodeURIComponent(query)}` : '';
      return (await fetchJson<{ places: ApiPlace[] }>(`/trips/${tripId}/suggestions${q}`)).places;
    },
    enabled: enabled && Boolean(tripId),
    staleTime: 60_000,
  });
}
