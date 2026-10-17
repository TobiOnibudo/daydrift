import { Bike, Car, ExternalLink, Footprints, Plus, Route } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import type { TripEditor } from '../hooks/useTripEditor';
import { MAX_STOPS } from '../lib/editing';
import { googleRouteUrl } from '../lib/maps-links';
import type { SharedApiTrip } from '../lib/types';

import { GuideNote } from './GuideNote';
import { ItineraryList } from './ItineraryList';
import { RefinePanel } from './RefinePanel';
import { SuggestionsPanel } from './SuggestionsPanel';
import { TripMap } from './TripMap';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

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
  /** Makes the trip editable. Leave out for read-only views such as shared links. */
  editor?: TripEditor;
  /** Lets the person tell the guide what changed. Leave out for read-only views. */
  refine?: { pending: boolean; submit: (instruction: string) => void };
}

/**
 * The finished trip. On large screens it fills the viewport: facts and a scrolling itinerary on
 * the left, a full-height map on the right. On phones the map pins to the top while the
 * itinerary scrolls beneath it, so the two always stay together.
 */
export function TripResultView({ trip, actions, back, editor, refine }: TripResultViewProps) {
  const { label, Icon } = MODE[trip.travelMode];
  const hasRoute = trip.routeGeojson !== null && trip.routeGeojson !== undefined;
  const googleUrl = googleRouteUrl(trip.legs, trip.travelMode);

  // One selection shared by the list and the map, so each drives the other.
  const [activeId, setActiveId] = useState<string | null>(null);
  const visibleActiveId = trip.legs.some((leg) => leg.placeId === activeId) ? activeId : null;
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // null = closed; otherwise adding a stop, or swapping out the stop with this id.
  const [picker, setPicker] = useState<{ swapId: string | null } | null>(null);

  const swapping = picker?.swapId ? trip.legs.find((l) => l.placeId === picker.swapId) : undefined;

  const pick = (placeId: string) => {
    if (!editor || !picker) return;
    if (picker.swapId) editor.swap(picker.swapId, placeId);
    else editor.add(placeId);
    setPicker(null);
  };

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

        {googleUrl && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">Take it with you:</span>
            <a href={googleUrl} target="_blank" rel="noopener noreferrer" className={navLink}>
              Open the route in Google Maps{' '}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
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
          activeId={visibleActiveId}
          hoveredId={hoveredId}
          onSelect={setActiveId}
          onHover={setHoveredId}
        />
      </div>

      <div className="min-h-0 lg:col-start-1 lg:row-start-2 lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:py-2 lg:pr-3">
        <GuideNote text={trip.narrative} className="mb-3" />
        {refine && (
          <RefinePanel pending={refine.pending} onSubmit={refine.submit} className="mb-5" />
        )}
        <ItineraryList
          legs={trip.legs}
          travelMode={trip.travelMode}
          activeId={visibleActiveId}
          hoveredId={hoveredId}
          onSelect={setActiveId}
          onHover={setHoveredId}
          editor={editor}
          onSwap={(swapId) => setPicker({ swapId })}
        />

        {editor && (
          <>
            <div className="mt-3 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={editor.busy || !editor.canAdd}
                onClick={() => setPicker({ swapId: null })}
              >
                <Plus aria-hidden="true" /> Add a stop
              </Button>
              {!editor.canAdd && (
                <span className="text-muted-foreground text-xs">
                  A trip can have up to {MAX_STOPS} stops.
                </span>
              )}
            </div>
            {picker && (
              <SuggestionsPanel
                key={picker.swapId ?? 'add'}
                tripId={trip.id}
                replacing={swapping?.name ?? null}
                busy={editor.busy}
                onPick={pick}
                onClose={() => setPicker(null)}
              />
            )}
          </>
        )}
      </div>
    </article>
  );
}
