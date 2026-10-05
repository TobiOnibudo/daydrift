import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockFetch, renderWithProviders } from '../test/utils';

import { SuggestionsPanel } from './SuggestionsPanel';

afterEach(() => vi.unstubAllGlobals());

const places = [
  { id: 'p1', name: 'High Park', category: 'park', description: 'Big green space.' },
  { id: 'p2', name: 'Kensington Market', category: 'market', description: null },
];

const setup = (props: Partial<React.ComponentProps<typeof SuggestionsPanel>> = {}) => {
  const onPick = vi.fn();
  const onClose = vi.fn();
  const fetchMock = mockFetch({ places });
  renderWithProviders(
    <SuggestionsPanel tripId="t1" onPick={onPick} onClose={onClose} {...props} />,
  );
  return { onPick, onClose, fetchMock, user: userEvent.setup() };
};

describe('SuggestionsPanel', () => {
  it('lists suggestions with their category and lets you pick one', async () => {
    const { onPick, user } = setup();
    const add = await screen.findByRole('button', { name: 'Add High Park' });
    expect(screen.getByText('Big green space.')).toBeInTheDocument();

    await user.click(add);
    expect(onPick).toHaveBeenCalledWith('p1');
  });

  it('searches by name after a pause in typing', async () => {
    const { fetchMock, user } = setup();
    await screen.findByRole('button', { name: 'Add High Park' });

    await user.type(screen.getByRole('searchbox', { name: /search places/i }), 'park');

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('?q=park'))).toBe(true),
    );
  });

  it('words the actions as a swap when replacing a stop', async () => {
    setup({ replacing: 'Casa Loma' });
    expect(screen.getByRole('region', { name: 'Swap out Casa Loma' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Swap in High Park' })).toBeInTheDocument();
  });

  it('closes on Escape and on the close button', async () => {
    const { onClose, user } = setup();
    await screen.findByRole('button', { name: 'Add High Park' });

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('says so when nothing matches', async () => {
    mockFetch({ places: [] });
    renderWithProviders(<SuggestionsPanel tripId="t1" onPick={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText(/no more suggestions/i)).toBeInTheDocument();
  });
});
