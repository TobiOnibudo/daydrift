import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { TripEditor } from '../hooks/useTripEditor';
import type { TripLeg } from '../lib/types';

import { ItineraryList } from './ItineraryList';

const legs: TripLeg[] = [
  {
    placeId: 'a',
    name: 'Royal Ontario Museum',
    order: 1,
    note: 'Start here',
    lat: 43.66,
    lng: -79.39,
  },
  { placeId: 'b', name: 'High Park', order: 2, lat: 43.64, lng: -79.46 },
];

const setup = (props: Partial<React.ComponentProps<typeof ItineraryList>> = {}) => {
  const onSelect = vi.fn();
  const onHover = vi.fn();
  const user = userEvent.setup();
  render(
    <ItineraryList
      legs={legs}
      travelMode="walking"
      onSelect={onSelect}
      onHover={onHover}
      {...props}
    />,
  );
  return { onSelect, onHover, user };
};

describe('ItineraryList', () => {
  it('renders each stop as a button that says what it does', () => {
    setup();
    expect(
      screen.getByRole('button', { name: 'Stop 1: Royal Ontario Museum. Show on map.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Stop 2: High Park. Show on map.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Start here')).toBeInTheDocument();
  });

  it('selects a stop on click', async () => {
    const { onSelect, user } = setup();
    await user.click(screen.getByRole('button', { name: /Stop 2/ }));
    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('is operable from the keyboard', async () => {
    const { onSelect, user } = setup();
    await user.tab();
    expect(screen.getByRole('button', { name: /Stop 1/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('a');
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('marks the selected stop as pressed and deselects it when pressed again', async () => {
    const { onSelect, user } = setup({ activeId: 'a' });
    const active = screen.getByRole('button', { name: /Stop 1/ });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Stop 2/ })).toHaveAttribute('aria-pressed', 'false');

    await user.click(active);
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('reports hover and keyboard focus so the matching map marker can highlight', async () => {
    const { onHover, user } = setup();
    const first = screen.getByRole('button', { name: /Stop 1/ });

    await user.hover(first);
    expect(onHover).toHaveBeenLastCalledWith('a');
    await user.unhover(first);
    expect(onHover).toHaveBeenLastCalledWith(null);

    await user.tab();
    expect(onHover).toHaveBeenLastCalledWith('a');
    await user.tab();
    expect(onHover).toHaveBeenLastCalledWith('b');
  });

  it('scrolls a stop chosen on the map into view', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { rerender } = render(<ItineraryList legs={legs} travelMode="walking" activeId={null} />);
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(<ItineraryList legs={legs} travelMode="walking" activeId="b" />);
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'nearest' }));
  });

  describe('directions for the selected stop', () => {
    it('shows no links until a stop is selected', () => {
      setup();
      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });

    it('offers one Google Maps link for the first stop, in a new tab, with no start point', () => {
      setup({ activeId: 'a' });
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(1);
      const href = new URL(links[0]?.getAttribute('href') as string);
      expect(href.hostname).toBe('www.google.com');
      expect(href.searchParams.get('destination')).toBe('43.66,-79.39');
      expect(href.searchParams.has('origin')).toBe(false);
      expect(links[0]).toHaveAttribute('target', '_blank');
      expect(links[0]).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(links[0]?.textContent).toMatch(/opens in a new tab/);
    });

    it('starts later stops from the previous one', () => {
      setup({ activeId: 'b' });
      const href = new URL(screen.getByRole('link').getAttribute('href') as string);
      expect(href.searchParams.get('origin')).toBe('43.66,-79.39');
      expect(href.searchParams.get('destination')).toBe('43.64,-79.46');
    });

    it('uses the trip travel mode', () => {
      setup({ activeId: 'a', travelMode: 'cycling' });
      expect(screen.getByRole('link').getAttribute('href')).toContain('travelmode=bicycling');
    });
  });
});

describe('ItineraryList one-line descriptions', () => {
  it('shows each stop with its category and a single descriptive line', () => {
    render(
      <ItineraryList
        travelMode="walking"
        legs={[
          {
            placeId: 'a',
            name: 'Royal Ontario Museum',
            order: 1,
            category: 'museum',
            note: 'Natural history and world cultures under one roof.',
            lat: 43.66,
            lng: -79.39,
          },
        ]}
      />,
    );
    expect(screen.getByText('Royal Ontario Museum')).toBeInTheDocument();
    expect(screen.getByText('museum')).toBeInTheDocument();
    expect(
      screen.getByText('Natural history and world cultures under one roof.'),
    ).toBeInTheDocument();
  });

  it('still renders stops saved before categories existed', () => {
    render(
      <ItineraryList
        travelMode="walking"
        legs={[{ placeId: 'a', name: 'Old Trip Stop', order: 1, lat: 1, lng: 1 }]}
      />,
    );
    expect(screen.getByText('Old Trip Stop')).toBeInTheDocument();
  });
});

describe('ItineraryList editing', () => {
  const makeEditor = (over: Partial<TripEditor> = {}): TripEditor => ({
    busy: false,
    canRemove: true,
    canAdd: true,
    move: vi.fn(),
    remove: vi.fn(),
    add: vi.fn(),
    swap: vi.fn(),
    ...over,
  });

  it('shows no edit controls without an editor, or before a stop is selected', () => {
    setup({ activeId: 'a' });
    expect(screen.queryByRole('group', { name: /edit/i })).not.toBeInTheDocument();

    setup({ editor: makeEditor() });
    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
  });

  it('moves, swaps and removes the selected stop', async () => {
    const editor = makeEditor();
    const onSwap = vi.fn();
    const { user } = setup({ activeId: 'b', editor, onSwap });

    await user.click(screen.getByRole('button', { name: 'Move High Park up' }));
    expect(editor.move).toHaveBeenCalledWith('b', -1);

    await user.click(screen.getByRole('button', { name: 'Swap High Park for another place' }));
    expect(onSwap).toHaveBeenCalledWith('b');

    await user.click(screen.getByRole('button', { name: 'Remove High Park' }));
    expect(editor.remove).toHaveBeenCalledWith('b');
  });

  it('disables moves at the ends of the list', () => {
    setup({ activeId: 'a', editor: makeEditor() });
    expect(screen.getByRole('button', { name: 'Move Royal Ontario Museum up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Royal Ontario Museum down' })).toBeEnabled();
  });

  it('disables removing at the minimum and everything while a save is in flight', () => {
    setup({ activeId: 'a', editor: makeEditor({ canRemove: false }) });
    expect(screen.getByRole('button', { name: 'Remove Royal Ontario Museum' })).toBeDisabled();
  });

  it('disables every edit while saving', () => {
    setup({ activeId: 'b', editor: makeEditor({ busy: true }) });
    for (const name of [/^Move .* up$/, /^Move .* down$/, /^Swap /, /^Remove /]) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });
});
