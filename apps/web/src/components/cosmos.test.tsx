import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Atmosphere } from './Atmosphere';
import { SectionTitle } from './SectionTitle';
import { TripCard } from './TripCard';
import { TripPreview } from './TripPreview';
import { miniRoutePath, miniRoutePoints } from './route/MiniRoute';
import { RouteThumb } from './route/RouteThumb';

describe('Atmosphere', () => {
  it('is pure decoration: hidden from assistive tech, inert, and never a tab stop', () => {
    const { container } = render(<Atmosphere />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root.className).toContain('pointer-events-none');
    expect(container.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
  });

  it('renders the same sky every time', () => {
    const first = render(<Atmosphere />).container.innerHTML;
    const second = render(<Atmosphere />).container.innerHTML;
    expect(second).toBe(first);
  });
});

describe('MiniRoute geometry', () => {
  it('places one point per stop, spread left to right inside the canvas', () => {
    const points = miniRoutePoints(5);
    expect(points).toHaveLength(5);
    const xs = points.map(([x]) => x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(Math.min(...xs)).toBeGreaterThan(0);
    expect(Math.max(...xs)).toBeLessThan(320);
    for (const [, y] of points) {
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(60);
    }
  });

  it('always draws at least a two-point route and a smooth curve through them', () => {
    expect(miniRoutePoints(0)).toHaveLength(2);
    const d = miniRoutePath(miniRoutePoints(3));
    expect(d.startsWith('M ')).toBe(true);
    expect(d.match(/C /g)).toHaveLength(2);
  });
});

describe('TripPreview', () => {
  const base: ComponentProps<typeof TripPreview> = {
    cityName: 'Toronto',
    duration: 'half-day',
    mode: 'walking',
    interests: [],
    stopCount: 5,
    locationPreference: '',
  };

  it('describes the trip being built, and updates as the choices change', () => {
    const { rerender } = render(<TripPreview {...base} interests={['art', 'coffee']} />);
    expect(screen.getByRole('region', { name: 'Your trip so far' })).toBeInTheDocument();
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText(/half a day, 5 stops, on foot.*art, coffee/)).toBeInTheDocument();

    rerender(<TripPreview {...base} duration="full-day" mode="cycling" />);
    expect(screen.getByText(/a full day, 5 stops, by bike/)).toBeInTheDocument();
  });

  it('has a friendly placeholder before a city is chosen', () => {
    render(<TripPreview {...base} cityName="" />);
    expect(screen.getByText('Somewhere wonderful')).toBeInTheDocument();
  });
});

describe('route artwork', () => {
  it('draws one dot per stop and stays hidden from assistive tech', () => {
    const legs = [
      { lat: 43.6, lng: -79.5 },
      { lat: 43.65, lng: -79.4 },
      { lat: 43.7, lng: -79.3 },
    ];
    const { container } = render(<RouteThumb legs={legs} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('circle')).toHaveLength(3);
  });

  it('copes with a trip that has no stops yet', () => {
    const { container } = render(<RouteThumb legs={[]} />);
    expect(container.querySelectorAll('circle')).toHaveLength(0);
  });
});

describe('TripCard', () => {
  it('shows the trip with its route artwork, and links to it', () => {
    const trip = {
      id: 't1',
      userId: 'u',
      city: 'toronto',
      interests: ['art'],
      duration: '2h',
      travelMode: 'walking',
      title: 'A Day',
      legs: [
        { placeId: 'a', name: 'A', order: 1, lat: 43.6, lng: -79.5 },
        { placeId: 'b', name: 'B', order: 2, lat: 43.7, lng: -79.3 },
      ],
      routeGeojson: null,
      totalDistanceKm: 1,
      vibeTags: [],
      status: 'complete',
      createdAt: '2026-01-01T00:00:00Z',
    } as const;
    const { container } = render(
      <MemoryRouter>
        <TripCard trip={trip as never} onDelete={() => undefined} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /A Day/ })).toHaveAttribute('href', '/trips/t1');
    expect(container.querySelectorAll('svg circle').length).toBeGreaterThanOrEqual(2);
  });
});

describe('SectionTitle', () => {
  it('renders the heading and optional subtitle, with a decorative underline', () => {
    const { container } = render(
      <SectionTitle title="My trips">Pick up where you left off.</SectionTitle>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'My trips' })).toBeInTheDocument();
    expect(screen.getByText('Pick up where you left off.')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
