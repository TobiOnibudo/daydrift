import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MockEventSource } from '../test/mock-event-source';
import { makeQueryClient, wrapper } from '../test/utils';

import { initialStreamState, streamReducer, useTripStream } from './useTripStream';

const trip = { id: 't1', title: 'A Day', status: 'complete', legs: [] } as never;

describe('streamReducer', () => {
  it('accumulates tokens and tracks the current step', () => {
    let s = streamReducer(initialStreamState, { type: 'status', step: 'generating' });
    s = streamReducer(s, { type: 'token', text: 'Hello ' });
    s = streamReducer(s, { type: 'token', text: 'world' });
    expect(s).toMatchObject({ phase: 'streaming', step: 'generating', narrative: 'Hello world' });
  });

  it('ends in complete or failed and resets cleanly', () => {
    expect(streamReducer(initialStreamState, { type: 'complete', trip }).phase).toBe('complete');
    const failed = streamReducer(initialStreamState, { type: 'failed', message: 'nope' });
    expect(failed).toMatchObject({ phase: 'failed', error: 'nope' });
    expect(streamReducer(failed, { type: 'reset' })).toEqual(initialStreamState);
  });
});

describe('useTripStream', () => {
  beforeEach(() => MockEventSource.install());

  const setup = (id: string | null = 't1') => {
    const client = makeQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const view = renderHook(({ tripId }) => useTripStream(tripId), {
      wrapper: wrapper(client),
      initialProps: { tripId: id },
    });
    return { ...view, invalidate };
  };

  it('stays idle without a trip id', () => {
    setup(null);
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it('opens the trip stream with credentials', () => {
    setup();
    expect(MockEventSource.last.url).toBe('/api/v1/trips/t1/stream');
    expect(MockEventSource.last.withCredentials).toBe(true);
  });

  it('follows status, token and complete events, then closes and refreshes caches', () => {
    const { result, invalidate } = setup();
    const source = MockEventSource.last;

    act(() => source.emit('status', { step: 'retrieving', label: 'Finding places' }));
    expect(result.current).toMatchObject({ phase: 'streaming', step: 'retrieving' });

    act(() => {
      source.emit('token', { text: 'Start ' });
      source.emit('token', { text: 'here.' });
    });
    expect(result.current.narrative).toBe('Start here.');

    act(() => source.emit('complete', { trip }));
    expect(result.current).toMatchObject({ phase: 'complete', trip });
    expect(source.closed).toBe(true);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trip', 't1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['trips'] });
  });

  it('surfaces a failed event and closes', () => {
    const { result } = setup();
    act(() => MockEventSource.last.emit('failed', { message: 'Please try again.' }));
    expect(result.current).toMatchObject({ phase: 'failed', error: 'Please try again.' });
    expect(MockEventSource.last.closed).toBe(true);
  });

  it('lets the browser retry a dropped connection but fails on a permanently closed one', () => {
    const { result } = setup();
    act(() => MockEventSource.last.fail(MockEventSource.CONNECTING));
    expect(result.current.phase).toBe('connecting');

    act(() => MockEventSource.last.fail(MockEventSource.CLOSED));
    expect(result.current.phase).toBe('failed');
    expect(result.current.error).toMatch(/lost the connection/i);
  });

  it('closes the connection on unmount and reopens for a new trip', () => {
    const { rerender, unmount } = setup('t1');
    const first = MockEventSource.last;

    rerender({ tripId: 't2' });
    expect(first.closed).toBe(true);
    expect(MockEventSource.last.url).toContain('/trips/t2/');

    unmount();
    expect(MockEventSource.last.closed).toBe(true);
  });
});
