import { useEffect, useReducer } from 'react';

import type { Trip } from './useTrips';

// Streaming generation is consumed with the NATIVE EventSource, NOT TanStack
// Query (see docs/05-frontend.md §2 & §4). This hook owns a local reducer for
// status / accumulated tokens / result and tears down the connection on unmount.

export type StreamStatus =
  'idle' | 'finding-places' | 'building-itinerary' | 'routing' | 'complete' | 'failed';

export interface TripStreamState {
  status: StreamStatus;
  narrative: string;
  trip: Trip | null;
  error: string | null;
}

type StreamAction =
  | { type: 'status'; status: StreamStatus }
  | { type: 'token'; token: string }
  | { type: 'complete'; trip: Trip }
  | { type: 'failed'; error: string };

const initialState: TripStreamState = {
  status: 'idle',
  narrative: '',
  trip: null,
  error: null,
};

function reducer(state: TripStreamState, action: StreamAction): TripStreamState {
  switch (action.type) {
    case 'status':
      return { ...state, status: action.status };
    case 'token':
      return { ...state, narrative: state.narrative + action.token };
    case 'complete':
      return { ...state, status: 'complete', trip: action.trip };
    case 'failed':
      return { ...state, status: 'failed', error: action.error };
    default:
      return state;
  }
}

/**
 * Subscribe to the SSE generation stream for a trip. Handles the
 * status / token / complete / failed events. Returns the live view state.
 */
export function useTripStream(tripId: string | null): TripStreamState {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!tripId) {
      return;
    }

    const url = `${import.meta.env.VITE_API_URL}/api/v1/trips/${tripId}/stream`;
    const source = new EventSource(url, { withCredentials: true });

    source.addEventListener('status', (event) => {
      dispatch({ type: 'status', status: (event as MessageEvent).data as StreamStatus });
    });

    source.addEventListener('token', (event) => {
      dispatch({ type: 'token', token: (event as MessageEvent).data as string });
    });

    source.addEventListener('complete', (event) => {
      const trip = JSON.parse((event as MessageEvent).data as string) as Trip;
      dispatch({ type: 'complete', trip });
      source.close();
    });

    source.addEventListener('failed', (event) => {
      dispatch({ type: 'failed', error: (event as MessageEvent).data as string });
      source.close();
    });

    source.onerror = () => {
      dispatch({ type: 'failed', error: 'Connection lost. Please retry.' });
      source.close();
    };

    return () => {
      source.close();
    };
  }, [tripId]);

  return state;
}
