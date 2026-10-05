import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SampleDay } from './SampleDay';

const stopNames = () =>
  within(screen.getByRole('list', { name: /sample itinerary/i }))
    .getAllByRole('listitem')
    .map((li) => li.querySelector('p')?.textContent);

describe('SampleDay', () => {
  it('starts on the day where nothing has gone wrong', () => {
    render(<SampleDay />);
    expect(screen.getByRole('button', { name: 'All going well' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(stopNames()).toEqual([
      'Kensington Market',
      'Trinity Bellwoods Park',
      'Queen Street West',
      'High Park',
    ]);
  });

  it('moves the outdoor stops indoors when it rains, keeping what still works', async () => {
    render(<SampleDay />);
    await userEvent.click(screen.getByRole('button', { name: "It's raining" }));

    // The outgoing stops animate out, so wait for the swap to finish.
    await waitFor(() =>
      expect(stopNames()).toEqual([
        'Kensington Market',
        'Royal Ontario Museum',
        'Queen Street West',
        'Art Gallery of Ontario',
      ]),
    );
    expect(screen.getByText(/rain changes the plan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "It's raining" })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shortens the day and starts it later when running late', async () => {
    render(<SampleDay />);
    await userEvent.click(screen.getByRole('button', { name: 'Running late' }));

    await waitFor(() => expect(stopNames()).toHaveLength(3));
    expect(screen.getByText(/starting later/i)).toBeInTheDocument();
    expect(screen.getByText('10:45')).toBeInTheDocument();
  });

  it('says what the guide did in a live region, so the change is announced', async () => {
    const { container } = render(<SampleDay />);
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(/your guide/i);
  });
});
