import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MockEventSource } from '../test/mock-event-source';
import { renderWithProviders } from '../test/utils';

import { TripGenerationView } from './TripGenerationView';

beforeEach(() => MockEventSource.install());

const steps = () =>
  screen
    .getAllByRole('listitem')
    .filter((li) => li.closest('ol')?.getAttribute('aria-label')?.includes('progress'));

describe('TripGenerationView', () => {
  it('starts with every step waiting and an empty guide', () => {
    renderWithProviders(<TripGenerationView tripId="t1" onRetry={vi.fn()} />);
    expect(steps().map((s) => s.textContent)).toEqual([
      expect.stringContaining('(waiting)'),
      expect.stringContaining('(waiting)'),
      expect.stringContaining('(waiting)'),
    ]);
    expect(screen.getByText(/gathering ideas/i)).toBeInTheDocument();
  });

  it('advances the stepper as status events arrive', () => {
    renderWithProviders(<TripGenerationView tripId="t1" onRetry={vi.fn()} />);
    act(() => MockEventSource.last.emit('status', { step: 'generating', label: 'Building' }));

    const [first, second, third] = steps();
    expect(first).toHaveTextContent('(done)');
    expect(second).toHaveAttribute('aria-current', 'step');
    expect(second).toHaveTextContent('(in progress)');
    expect(third).toHaveTextContent('(waiting)');
  });

  it('streams narrative text into a polite live region', () => {
    renderWithProviders(<TripGenerationView tripId="t1" onRetry={vi.fn()} />);
    act(() => {
      MockEventSource.last.emit('token', { text: 'Start at ' });
      MockEventSource.last.emit('token', { text: 'the park.' });
    });

    const region = screen.getByLabelText(/your guide is writing/i);
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('Start at the park.');
  });

  it('shows an actionable error and retries on request when generation fails', async () => {
    const onRetry = vi.fn();
    renderWithProviders(<TripGenerationView tripId="t1" onRetry={onRetry} />);
    act(() =>
      MockEventSource.last.emit('failed', { message: 'We could not generate your itinerary.' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent('We could not generate your itinerary.');
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('disables retry while a retry is already in flight', () => {
    renderWithProviders(<TripGenerationView tripId="t1" onRetry={vi.fn()} retrying />);
    act(() => MockEventSource.last.emit('failed', { message: 'x' }));
    expect(screen.getByRole('button', { name: /try again/i })).toBeDisabled();
  });
});

describe('TripGenerationView while revising', () => {
  it('says the guide is rethinking the day', () => {
    renderWithProviders(<TripGenerationView tripId="t1" onRetry={vi.fn()} revising />);
    expect(screen.getByText(/rethinking the day/i)).toBeInTheDocument();
  });

  it('reports a failure instead of offering to replan, since the trip is unchanged', () => {
    const onFinished = vi.fn();
    renderWithProviders(
      <TripGenerationView tripId="t1" onRetry={vi.fn()} revising onFinished={onFinished} />,
    );
    act(() => MockEventSource.last.emit('failed', { message: 'Unchanged.' }));

    expect(onFinished).toHaveBeenCalledOnce();
    expect(onFinished).toHaveBeenCalledWith({ ok: false, message: 'Unchanged.' });
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('reports success once when the stream completes', () => {
    const onFinished = vi.fn();
    const { rerender } = renderWithProviders(
      <TripGenerationView tripId="t1" onRetry={vi.fn()} revising onFinished={onFinished} />,
    );
    act(() => MockEventSource.last.emit('complete', { trip: { id: 't1' } }));
    rerender(<TripGenerationView tripId="t1" onRetry={vi.fn()} revising onFinished={onFinished} />);

    expect(onFinished).toHaveBeenCalledOnce();
    expect(onFinished).toHaveBeenCalledWith({ ok: true });
  });
});
