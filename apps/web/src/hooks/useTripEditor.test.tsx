import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiTrip } from '../lib/types';
import { makeQueryClient, wrapper } from '../test/utils';

import { useTripEditor } from './useTripEditor';

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const leg = (placeId: string, order: number) => ({
  placeId,
  name: placeId.toUpperCase(),
  order,
  lat: 43.6,
  lng: -79.4,
});

const makeTrip = (ids: string[]) =>
  ({
    id: 't1',
    status: 'complete',
    legs: ids.map((id, i) => leg(id, i + 1)),
  }) as unknown as ApiTrip;

const saved = (ids: string[]) => ({
  ok: true,
  status: 200,
  json: async () => ({ trip: makeTrip(ids) }),
});

const sentIds = (fetchMock: ReturnType<typeof vi.fn>, call = 0) =>
  JSON.parse(fetchMock.mock.calls[call]![1].body).placeIds;

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  toast.mockClear();
  toast.error.mockClear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function setup(ids: string[]) {
  const client = makeQueryClient();
  const trip = makeTrip(ids);
  client.setQueryData(['trip', 't1'], trip);
  const hook = renderHook(() => useTripEditor(trip), { wrapper: wrapper(client) });
  return { client, ...hook };
}

describe('useTripEditor', () => {
  it('saves a move as the full ordered list and updates the cached trip', async () => {
    fetchMock.mockResolvedValue(saved(['b', 'a', 'c']));
    const { result, client } = setup(['a', 'b', 'c']);

    act(() => result.current.move('a', 1));

    await waitFor(() => expect(toast).toHaveBeenCalledWith('Stop moved', expect.anything()));
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/trips/t1/stops');
    expect(fetchMock.mock.calls[0]![1].method).toBe('PATCH');
    expect(sentIds(fetchMock)).toEqual(['b', 'a', 'c']);
    expect(client.getQueryData<ApiTrip>(['trip', 't1'])?.legs.map((l) => l.placeId)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('ignores moves past either end', () => {
    const { result } = setup(['a', 'b']);
    act(() => result.current.move('a', -1));
    act(() => result.current.move('b', 1));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a removal immediately, before the server answers', async () => {
    let finish: (value: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result, client } = setup(['a', 'b', 'c']);

    act(() => result.current.remove('b'));

    await waitFor(() =>
      expect(client.getQueryData<ApiTrip>(['trip', 't1'])?.legs.map((l) => l.placeId)).toEqual([
        'a',
        'c',
      ]),
    );
    finish(saved(['a', 'c']));
    await waitFor(() => expect(result.current.busy).toBe(false));
  });

  it('rolls back and explains when the server refuses', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 'VALIDATION_ERROR', message: 'Nope.' } }),
    });
    const { result, client } = setup(['a', 'b', 'c']);

    act(() => result.current.remove('b'));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(client.getQueryData<ApiTrip>(['trip', 't1'])?.legs.map((l) => l.placeId)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('offers Undo, which saves the previous order again', async () => {
    fetchMock.mockResolvedValue(saved(['a', 'c']));
    const { result } = setup(['a', 'b', 'c']);

    act(() => result.current.remove('b'));
    await waitFor(() => expect(toast).toHaveBeenCalled());

    fetchMock.mockResolvedValue(saved(['a', 'b', 'c']));
    act(() => toast.mock.calls[0]![1].action.onClick());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sentIds(fetchMock, 1)).toEqual(['a', 'b', 'c']);
  });

  it('adds to the end and swaps in place', async () => {
    fetchMock.mockResolvedValue(saved(['a', 'b', 'd']));
    const { result } = setup(['a', 'b']);

    act(() => result.current.add('d'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentIds(fetchMock)).toEqual(['a', 'b', 'd']);

    await waitFor(() => expect(result.current.busy).toBe(false));
    act(() => result.current.swap('a', 'z'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sentIds(fetchMock, 1)).toEqual(['z', 'b']);
  });

  it('will not go below the minimum or above the maximum number of stops', () => {
    const small = setup(['a', 'b']);
    expect(small.result.current.canRemove).toBe(false);
    act(() => small.result.current.remove('a'));

    const full = setup(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(full.result.current.canAdd).toBe(false);
    act(() => full.result.current.add('x'));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
