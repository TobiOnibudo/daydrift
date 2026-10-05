import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useReducer } from 'react';

import { API_BASE } from '../lib/api';
import type { ApiTrip, TripStep } from '../lib/types';

import { tripKey } from './useTrips';

// Streaming generation uses the NATIVE EventSource, not TanStack Query (docs/05 §2, §4). The hook
// owns a reducer for phase / step / narrative / result and closes the connection on unmount.

export type StreamPhase = 'connecting' | 'streaming' | 'complete' | 'failed';

export interface TripStreamState {
  phase: StreamPhase;
  step: TripStep | null;
  narrative: string;
  trip: ApiTrip | null;
  error: string | null;
}

export type StreamAction =
  | { type: 'status'; step: TripStep }
  | { type: 'token'; text: string }
  | { type: 'complete'; trip: ApiTrip }
  | { type: 'failed'; message: string }
  | { type: 'reset' };

export const initialStreamState: TripStreamState = {
  phase: 'connecting',
  step: null,
  narrative: '',
  trip: null,
  error: null,
};

export function streamReducer(state: TripStreamState, action: StreamAction): TripStreamState {
  switch (action.type) {
    case 'status':
      return { ...state, phase: 'streaming', step: action.step };
    case 'token':
      return { ...state, phase: 'streaming', narrative: state.narrative + action.text };
    case 'complete':
      return { ...state, phase: 'complete', trip: action.trip, error: null };
    case 'failed':
      return { ...state, phase: 'failed', error: action.message };
    case 'reset':
      return initialStreamState;
  }
}

const CONNECTION_LOST = 'We lost the connection while planning your trip.';

const parse = <T>(event: Event): T => JSON.parse((event as MessageEvent<string>).data) as T;

/**
 * Subscribe to a trip's SSE stream. The API replays the terminal event when a trip already
 * finished, so this is safe to open at any time. Pass `null` to stay idle.
 */
export function useTripStream(tripId: string | null): TripStreamState {
  const [state, dispatch] = useReducer(streamReducer, initialStreamState);
  const queryClient = useQueryClient();

  useEffect(() => {
    dispatch({ type: 'reset' });
    if (!tripId) return;

    const source = new EventSource(`${API_BASE}/trips/${tripId}/stream`, { withCredentials: true });
    let finished = false;

    const finish = () => {
      finished = true;
      source.close();
    };

    source.addEventListener('status', (event) => {
      dispatch({ type: 'status', step: parse<{ step: TripStep }>(event).step });
    });
    source.addEventListener('token', (event) => {
      dispatch({ type: 'token', text: parse<{ text: string }>(event).text });
    });
    source.addEventListener('complete', (event) => {
      finish();
      dispatch({ type: 'complete', trip: parse<{ trip: ApiTrip }>(event).trip });
      void queryClient.invalidateQueries({ queryKey: tripKey(tripId) });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
    });
    source.addEventListener('failed', (event) => {
      finish();
      dispatch({ type: 'failed', message: parse<{ message: string }>(event).message });
      void queryClient.invalidateQueries({ queryKey: tripKey(tripId) });
    });

    // The browser retries dropped connections itself (readyState CONNECTING); only a permanently
    // closed source (e.g. a 401/404 response) is a failure.
    source.onerror = () => {
      if (!finished && source.readyState === EventSource.CLOSED) {
        finish();
        dispatch({ type: 'failed', message: CONNECTION_LOST });
      }
    };

    return finish;
  }, [tripId, queryClient]);

  return state;
}
