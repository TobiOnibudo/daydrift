import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SharedApiTrip } from '../lib/types';

// The real map needs a layout engine; here it only matters that the two views share one selection.
const mapProps = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('./TripMap', () => ({
  TripMap: (props: Record<string, unknown>) => {
    mapProps.current = props;
    return (
      <div
        data-testid="map"
        data-active={String(props.activeId)}
        data-hovered={String(props.hoveredId)}
      />
    );
  },
}));

const { TripResultView } = await import('./TripResultView');

const trip: SharedApiTrip = {
  id: 't1',
  city: 'toronto',
  interests: ['art'],
  duration: '2h',
  travelMode: 'walking',
  title: 'A Day',
  legs: [
    { placeId: 'a', name: 'Royal Ontario Museum', order: 1, lat: 43.66, lng: -79.39 },
    { placeId: 'b', name: 'High Park', order: 2, lat: 43.64, lng: -79.46 },
  ],
  routeGeojson: null,
  totalDistanceKm: 2,
  vibeTags: [],
  status: 'complete',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('TripResultView list and map linking', () => {
  it('passes a stop chosen in the list to the map', async () => {
    render(<TripResultView trip={trip} />);
    expect(screen.getByTestId('map')).toHaveAttribute('data-active', 'null');

    await userEvent.click(screen.getByRole('button', { name: /Stop 2/ }));
    expect(screen.getByTestId('map')).toHaveAttribute('data-active', 'b');
    expect(screen.getByRole('button', { name: /Stop 2/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('highlights the matching list item when a marker is chosen on the map', () => {
    render(<TripResultView trip={trip} />);
    act(() => (mapProps.current.onSelect as (id: string | null) => void)('a'));
    expect(screen.getByRole('button', { name: /Stop 1/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Stop 2/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clears the selection when the map asks for the full route', async () => {
    render(<TripResultView trip={trip} />);
    await userEvent.click(screen.getByRole('button', { name: /Stop 1/ }));
    act(() => (mapProps.current.onSelect as (id: string | null) => void)(null));
    expect(screen.getByTestId('map')).toHaveAttribute('data-active', 'null');
    expect(screen.getByRole('button', { name: /Stop 1/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shares hover both ways', async () => {
    render(<TripResultView trip={trip} />);
    await userEvent.hover(screen.getByRole('button', { name: /Stop 2/ }));
    expect(screen.getByTestId('map')).toHaveAttribute('data-hovered', 'b');

    act(() => (mapProps.current.onHover as (id: string | null) => void)('a'));
    expect(screen.getByTestId('map')).toHaveAttribute('data-hovered', 'a');
  });
});
