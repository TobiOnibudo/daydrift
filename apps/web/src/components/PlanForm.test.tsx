import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MAX_INTERESTS, PlanForm } from './PlanForm';

const cities = [
  { key: 'halifax', name: 'Halifax', placeCount: 464 },
  { key: 'toronto', name: 'Toronto', placeCount: 827 },
];

const setup = (props: Partial<React.ComponentProps<typeof PlanForm>> = {}) => {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(<PlanForm cities={cities} submitting={false} onSubmit={onSubmit} {...props} />);
  return { onSubmit, user };
};

describe('PlanForm', () => {
  it('submits sensible defaults: first city, no interests, half a day on foot', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('button', { name: /plan my trip/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      city: 'halifax',
      interests: [],
      duration: 'half-day',
      travelMode: 'walking',
    });
  });

  it('submits the chosen city, interests, length and mode', async () => {
    const { onSubmit, user } = setup();
    await user.selectOptions(screen.getByLabelText(/where are you headed/i), 'toronto');
    await user.click(screen.getByRole('button', { name: 'art' }));
    await user.click(screen.getByRole('button', { name: 'coffee' }));
    await user.click(screen.getByLabelText(/a full day/i));
    await user.click(screen.getByLabelText(/by bike/i));
    await user.click(screen.getByRole('button', { name: /plan my trip/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      city: 'toronto',
      interests: ['art', 'coffee'],
      duration: 'full-day',
      travelMode: 'cycling',
    });
  });

  it('toggles interests on and off and reports the state to assistive tech', async () => {
    const { user } = setup();
    const art = screen.getByRole('button', { name: 'art' });
    expect(art).toHaveAttribute('aria-pressed', 'false');
    await user.click(art);
    expect(art).toHaveAttribute('aria-pressed', 'true');
    await user.click(art);
    expect(art).toHaveAttribute('aria-pressed', 'false');
  });

  it('adds custom interests (lowercased, deduplicated) with Enter or the Add button', async () => {
    const { onSubmit, user } = setup();
    const input = screen.getByLabelText(/add your own interest/i);
    await user.type(input, 'Street Art{Enter}');
    await user.type(input, 'street art');
    await user.click(screen.getByRole('button', { name: /add/i }));
    await user.click(screen.getByRole('button', { name: /plan my trip/i }));

    expect(onSubmit.mock.calls[0]![0].interests).toEqual(['street art']);
  });

  it('stops accepting interests at the limit', async () => {
    const { user } = setup();
    for (const label of [
      'art',
      'coffee',
      'history',
      'parks',
      'food',
      'views',
      'theatre',
      'markets',
      'museums',
    ]) {
      await user.click(screen.getByRole('button', { name: label }));
    }
    await user.type(screen.getByLabelText(/add your own interest/i), 'extra{Enter}');
    expect(screen.getByText(new RegExp(`limit of ${MAX_INTERESTS}`))).toBeInTheDocument();
    expect(screen.getByLabelText(/add your own interest/i)).toBeDisabled();
  });

  it('disables submission while a request is in flight and shows errors as alerts', () => {
    setup({ submitting: true, error: 'We could not start your trip.' });
    expect(screen.getByRole('button', { name: /starting/i })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('We could not start your trip.');
  });
});
