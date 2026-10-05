import { Bike, Car, ExternalLink, Footprints, Route } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { appleRouteUrl, googleRouteUrl } from '../lib/maps-links';
import type { SharedApiTrip } from '../lib/types';

import { ItineraryList } from './ItineraryList';
import { TripMap } from './TripMap';
import { Badge } from './ui/badge';

const MODE = {
  walking: { label: 'On foot', Icon: Footprints },
  cycling: { label: 'By bike', Icon: Bike },
  driving: { label: 'By car', Icon: Car },
} as const;

const DURATION = {
  '2h': 'A couple of hours',
  'half-day': 'Half a day',
  'full-day': 'A full day',
} as const;

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const navLink =
  'inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium shadow-soft transition-all hover:-translate-y-0.5 hover:bg-accent active:translate-y-0';

interface TripResultViewProps {
  trip: SharedApiTrip;
  /** Action buttons shown beside the title (regenerate, share, ...). */
  actions?: ReactNode;
  /** A link back to the trip list, placed above the title. */
  back?: ReactNode;
}

/**
 * The finished trip. On large screens it fills the viewport: facts and a scrolling itinerary on
 * the left, a full-height map on the right. On phones the map pins to the top while the
 * itinerary scrolls beneath it, so the two always stay together.
 */
export function TripResultView({ trip, actions, back }: TripResultViewProps) {
  const { label, Icon } = MODE[trip.travelMode];
  const hasRoute = trip.routeGeojson !== null && trip.routeGeojson !== undefined;
  const googleUrl = googleRouteUrl(trip.legs, trip.travelMode);
  const appleUrl = appleRouteUrl(trip.legs, trip.travelMode);

  // One selection shared by the list and the map, so each drives the other.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <article className="lg:fit-screen flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-6 lg:gap-y-3">
      <header className="space-y-3 lg:col-start-1 lg:row-start-1">
        {back}
        <div className="space-y-1">
          <p className="text-secondary text-sm font-medium uppercase tracking-wider">
            {titleCase(trip.city)}
          </p>
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
            {trip.title ?? 'Your trip'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{DURATION[trip.duration]}</Badge>
          <Badge variant="outline">
            <Icon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </Badge>
          {trip.totalDistanceKm ? (
            <Badge variant="outline">
              <Route className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {trip.totalDistanceKm.toFixed(1)} km{hasRoute ? '' : ' (straight line)'}
            </Badge>
          ) : null}
          {trip.vibeTags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>

        {googleUrl && appleUrl && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">Take it with you:</span>
            <a href={googleUrl} target="_blank" rel="noopener noreferrer" className={navLink}>
              Google Maps <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">(opens the full route in a new tab)</span>
            </a>
            <a href={appleUrl} target="_blank" rel="noopener noreferrer" className={navLink}>
              Apple Maps <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">(opens the full route in a new tab)</span>
            </a>
          </div>
        )}

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>

      {/* Phones: the map pins to the top while the list scrolls under it. Desktop: full height. */}
      <div className="sticky top-2 z-10 h-[40dvh] min-h-[16rem] lg:static lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-full lg:min-h-[24rem]">
        <TripMap
          legs={trip.legs}
          routeGeojson={trip.routeGeojson}
          activeId={activeId}
          hoveredId={hoveredId}
          onSelect={setActiveId}
          onHover={setHoveredId}
        />
      </div>

      <div className="min-h-0 lg:col-start-1 lg:row-start-2 lg:overflow-y-auto lg:overscroll-contain lg:py-2 lg:pr-3">
        <ItineraryList
          legs={trip.legs}
          travelMode={trip.travelMode}
          activeId={activeId}
          hoveredId={hoveredId}
          onSelect={setActiveId}
          onHover={setHoveredId}
        />
      </div>
    </article>
  );
}
