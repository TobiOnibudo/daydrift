import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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
  render(<ItineraryList legs={legs} onSelect={onSelect} onHover={onHover} {...props} />);
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
    const { rerender } = render(<ItineraryList legs={legs} activeId={null} />);
    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(<ItineraryList legs={legs} activeId="b" />);
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'nearest' }));
  });
});
