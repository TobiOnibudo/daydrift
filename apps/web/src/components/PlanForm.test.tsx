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
      stopCount: 5,
      locationPreference: '',
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
      stopCount: 5,
      locationPreference: '',
    });
  });

  it('submits a chosen stop count and preferred area', async () => {
    const { onSubmit, user } = setup();
    await user.selectOptions(screen.getByLabelText(/how many stops/i), '8');
    await user.type(screen.getByLabelText(/neighbourhood or landmark/i), 'Waterfront');
    await user.click(screen.getByRole('button', { name: /plan my trip/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ stopCount: 8, locationPreference: 'Waterfront' }),
    );
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

describe('PlanForm feedback', () => {
  const addInterest = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
    await user.type(screen.getByLabelText(/add your own interest/i), `${text}{Enter}`);
  };

  it('explains why a custom interest was rejected and keeps what was typed', async () => {
    const { user } = setup();
    await addInterest(user, '<script>');
    expect(screen.getByText(/letters, numbers/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/add your own interest/i)).toHaveValue('<script>');
    expect(screen.getByLabelText(/add your own interest/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('tells the person when an interest is already on the list, and clears once they edit', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'art' }));
    await addInterest(user, 'Art');
    expect(screen.getByText(/"art" is already on your list/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/add your own interest/i), 'x');
    expect(screen.queryByText(/already on your list/)).not.toBeInTheDocument();
  });

  it('asks for text when Add is pressed with nothing typed', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /add/i }));
    expect(screen.getByText(/type an interest to add it/i)).toBeInTheDocument();
  });

  it('shows how many interests are chosen', async () => {
    const { user } = setup();
    expect(screen.getByText('0 of 10 chosen')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'art' }));
    expect(screen.getByText('1 of 10 chosen')).toBeInTheDocument();
  });

  it('puts server-reported problems next to their fields and focuses the summary', () => {
    setup({
      error: 'Please fix the highlighted fields and try again.',
      fieldErrors: { city: 'Choose a city.', duration: 'Choose how long you have.' },
    });
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.getByLabelText(/where are you headed/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Choose a city.')).toBeInTheDocument();
    expect(screen.getByText('Choose how long you have.')).toBeInTheDocument();
  });
});
