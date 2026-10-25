import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TripEditor } from '../hooks/useTripEditor';
import type { SharedApiTrip } from '../lib/types';
import { mockFetch, renderWithProviders } from '../test/utils';

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
  stopCount: 2,
  locationPreference: '',
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

describe('TripResultView guide note', () => {
  it('shows what the guide said, when the trip has a narrative', () => {
    render(<TripResultView trip={{ ...trip, narrative: 'Start with art, end with a stroll.' }} />);
    expect(screen.getByRole('region', { name: 'From your guide' })).toHaveTextContent(
      'Start with art, end with a stroll.',
    );
  });

  it('omits the note for trips planned before narratives were saved', () => {
    render(<TripResultView trip={trip} />);
    expect(screen.queryByRole('region', { name: 'From your guide' })).not.toBeInTheDocument();
  });
});

describe('TripResultView editing', () => {
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
  const places = [{ id: 'p9', name: 'Casa Loma', category: 'landmark', description: null }];

  afterEach(() => vi.unstubAllGlobals());

  it('is read-only without an editor: no edit controls and no way to ask the guide', () => {
    renderWithProviders(<TripResultView trip={trip} />);
    expect(screen.queryByRole('button', { name: /add a stop/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /ask your guide/i })).not.toBeInTheDocument();
  });

  it('offers the guide only when it can be asked', () => {
    renderWithProviders(
      <TripResultView trip={trip} refine={{ pending: false, submit: vi.fn() }} />,
    );
    expect(screen.getByRole('region', { name: /ask your guide/i })).toBeInTheDocument();
  });

  it('adds a place picked from the suggestions', async () => {
    mockFetch({ places });
    const editor = makeEditor();
    renderWithProviders(<TripResultView trip={trip} editor={editor} />);

    await userEvent.click(screen.getByRole('button', { name: /add a stop/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'Add Casa Loma' }));

    expect(editor.add).toHaveBeenCalledWith('p9');
    expect(screen.queryByRole('region', { name: 'Add a stop' })).not.toBeInTheDocument();
  });

  it('swaps the selected stop for a place picked from the suggestions', async () => {
    mockFetch({ places });
    const editor = makeEditor();
    renderWithProviders(<TripResultView trip={trip} editor={editor} />);

    await userEvent.click(screen.getByRole('button', { name: /Stop 2/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Swap High Park/ }));
    expect(screen.getByRole('region', { name: 'Swap out High Park' })).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: 'Swap in Casa Loma' }));
    expect(editor.swap).toHaveBeenCalledWith('b', 'p9');
  });

  it('stops offering additions at the maximum', () => {
    renderWithProviders(<TripResultView trip={trip} editor={makeEditor({ canAdd: false })} />);
    expect(screen.getByRole('button', { name: /add a stop/i })).toBeDisabled();
    expect(screen.getByText(/up to 12 stops/i)).toBeInTheDocument();
  });

  it('clears the selection when the selected stop is removed', async () => {
    const editor = makeEditor();
    const { rerender } = renderWithProviders(<TripResultView trip={trip} editor={editor} />);
    await userEvent.click(screen.getByRole('button', { name: /Stop 2/ }));
    expect(screen.getByTestId('map')).toHaveAttribute('data-active', 'b');

    rerender(<TripResultView trip={{ ...trip, legs: trip.legs.slice(0, 1) }} editor={editor} />);
    expect(screen.getByTestId('map')).toHaveAttribute('data-active', 'null');
    expect(screen.getByRole('button', { name: /Stop 1/ })).toHaveAttribute('aria-pressed', 'false');
  });
});
