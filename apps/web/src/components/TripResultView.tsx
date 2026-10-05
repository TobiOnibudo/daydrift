import { Bike, Car, Footprints, Route } from 'lucide-react';
import type { ReactNode } from 'react';

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

interface TripResultViewProps {
  trip: SharedApiTrip;
  /** Action buttons shown beside the title (regenerate, share, ...). */
  actions?: ReactNode;
}

/** The finished trip: title and facts, the itinerary timeline, and the route map. */
export function TripResultView({ trip, actions }: TripResultViewProps) {
  const { label, Icon } = MODE[trip.travelMode];
  const hasRoute = trip.routeGeojson !== null && trip.routeGeojson !== undefined;

  return (
    <article className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <p className="text-primary text-sm font-medium uppercase tracking-wider">
            {titleCase(trip.city)}
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            {trip.title ?? 'Your trip'}
          </h1>
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
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <ItineraryList legs={trip.legs} />
        <div className="lg:sticky lg:top-6 lg:self-start">
          <TripMap legs={trip.legs} routeGeojson={trip.routeGeojson} />
        </div>
      </div>
    </article>
  );
}
