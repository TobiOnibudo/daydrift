import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CreateTripPayload } from '../lib/types';
import { makeQueryClient, mockFetch, wrapper } from '../test/utils';

import {
  useCities,
  useCreateTrip,
  useDeleteTrip,
  useRefineTrip,
  useShareTrip,
  useTrips,
} from './useTrips';

afterEach(() => vi.unstubAllGlobals());

describe('query hooks', () => {
  it('useTrips unwraps the { trips } envelope', async () => {
    mockFetch({ trips: [{ id: 't1' }] });
    const { result } = renderHook(() => useTrips(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 't1' }]);
  });

  it('useCities unwraps the { cities } envelope', async () => {
    mockFetch({ cities: [{ key: 'toronto', name: 'Toronto', placeCount: 3 }] });
    const { result } = renderHook(() => useCities(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.name).toBe('Toronto');
  });
});

describe('mutation hooks', () => {
  it('useCreateTrip posts the payload and invalidates the trips list', async () => {
    const fetchMock = mockFetch({ tripId: 't9', status: 'pending' });
    const client = makeQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateTrip(), { wrapper: wrapper(client) });

    const payload: CreateTripPayload = {
      city: 'toronto',
      interests: ['art'],
      duration: '2h',
      travelMode: 'walking',
      stopCount: 3,
      locationPreference: '',
    };
    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ tripId: 't9', status: 'pending' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/v1/trips');
    expect(JSON.parse(init.body)).toEqual(payload);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trips'] });
  });

  it('useDeleteTrip drops the trip from the cache and refreshes the list', async () => {
    mockFetch(undefined, { status: 204 });
    const client = makeQueryClient();
    client.setQueryData(['trip', 't1'], { id: 't1' });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteTrip(), { wrapper: wrapper(client) });

    result.current.mutate('t1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData(['trip', 't1'])).toBeUndefined();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trips'] });
  });

  it('useShareTrip returns the token and refreshes the trip', async () => {
    mockFetch({ shareToken: 'tok123' });
    const client = makeQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useShareTrip('t1'), { wrapper: wrapper(client) });

    result.current.enable.mutate();
    await waitFor(() => expect(result.current.enable.isSuccess).toBe(true));

    expect(result.current.enable.data).toBe('tok123');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trip', 't1'] });
  });
});

describe('useRefineTrip', () => {
  it('posts the note, marks the trip as being worked on, and refreshes the list', async () => {
    const fetchMock = mockFetch({ tripId: 't1', status: 'pending' }, { status: 202 });
    const client = makeQueryClient();
    client.setQueryData(['trip', 't1'], { id: 't1', status: 'complete', legs: [{ placeId: 'a' }] });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRefineTrip('t1'), { wrapper: wrapper(client) });

    result.current.mutate("It's raining");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/v1/trips/t1/refine');
    expect(JSON.parse(init.body)).toEqual({ instruction: "It's raining" });
    // the itinerary stays in the cache; only its status changes
    expect(client.getQueryData(['trip', 't1'])).toMatchObject({
      status: 'pending',
      legs: [{ placeId: 'a' }],
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trips'] });
  });

  it('leaves the trip alone when the guide cannot be reached', async () => {
    mockFetch({ error: { code: 'CONFLICT', message: 'busy' } }, { status: 409 });
    const client = makeQueryClient();
    client.setQueryData(['trip', 't1'], { id: 't1', status: 'complete' });
    const { result } = renderHook(() => useRefineTrip('t1'), { wrapper: wrapper(client) });

    result.current.mutate('More food');
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(['trip', 't1'])).toMatchObject({ status: 'complete' });
  });
});
