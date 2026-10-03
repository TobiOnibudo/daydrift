import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchJson } from '../lib/api';

// Data hooks encapsulate all server state + caching (see docs/05-frontend.md §2).
// Cache-key convention: ['trips'], ['trip', id], ['places', query].
//
// NOTE: shared domain types live in @daydrift/types once that package is
// populated. Local placeholder shapes are used here to keep the stub compiling.
export interface Place {
  id: string;
  name: string;
}

export interface Trip {
  id: string;
  title: string;
}

export interface CreateTripInput {
  title: string;
}

// --- Queries -------------------------------------------------------------

/** Place search / autocomplete. Keyed by the query string. */
export function usePlaces(query: string) {
  return useQuery({
    queryKey: ['places', query],
    queryFn: () => fetchJson<Place[]>(`/places?q=${encodeURIComponent(query)}`),
    enabled: query.length > 0,
  });
}

/** Single trip detail, keyed by trip id. */
export function useTrip(tripId: string) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => fetchJson<Trip>(`/trips/${tripId}`),
    enabled: Boolean(tripId),
  });
}

/** Current user's trip list. */
export function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: () => fetchJson<Trip[]>('/trips'),
  });
}

// --- Mutations -----------------------------------------------------------

/** Create a trip; invalidates the ['trips'] list. */
export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripInput) =>
      fetchJson<Trip>('/trips', { method: 'POST', json: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

/** Delete a trip; invalidates the ['trips'] list and the affected ['trip', id]. */
export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => fetchJson<void>(`/trips/${tripId}`, { method: 'DELETE' }),
    onSuccess: (_data, tripId) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}

/** Regenerate a trip's itinerary; invalidates the affected ['trip', id]. */
export function useRegenerateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) =>
      fetchJson<Trip>(`/trips/${tripId}/regenerate`, { method: 'POST' }),
    onSuccess: (_data, tripId) => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}
