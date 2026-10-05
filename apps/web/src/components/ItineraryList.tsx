import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Navigation } from 'lucide-react';
import { useEffect } from 'react';

import { appleToStopUrl, googleToStopUrl } from '../lib/maps-links';
import type { TravelMode, TripLeg } from '../lib/types';
import { cn } from '../lib/utils';

interface ItineraryListProps {
  legs: TripLeg[];
  travelMode: TravelMode;
  /** The selected stop. Pressing it again clears the selection. */
  activeId?: string | null;
  hoveredId?: string | null;
  onSelect?: (placeId: string | null) => void;
  onHover?: (placeId: string | null) => void;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
} as const;

export const stopElementId = (placeId: string) => `stop-${placeId}`;

const linkClass =
  'inline-flex items-center gap-1 rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent';

function NavLinks({ label, google, apple }: { label: string; google: string; apple: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <a href={google} target="_blank" rel="noopener noreferrer" className={linkClass}>
        Google Maps<span className="sr-only"> (opens in a new tab)</span>
      </a>
      <a href={apple} target="_blank" rel="noopener noreferrer" className={linkClass}>
        Apple Maps<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}

/**
 * The itinerary as a timeline on the signature route line. Each stop is a button linked to its
 * marker on the map: activate it to fly there, hover or focus it to highlight the marker. The
 * selected stop expands with directions in Google or Apple Maps.
 */
export function ItineraryList({
  legs,
  travelMode,
  activeId = null,
  hoveredId = null,
  onSelect,
  onHover,
}: ItineraryListProps) {
  const reduceMotion = useReducedMotion();

  // When a marker is chosen on the map, bring its stop into view here.
  useEffect(() => {
    if (!activeId) return;
    document
      .getElementById(stopElementId(activeId))
      ?.scrollIntoView?.({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [activeId, reduceMotion]);

  return (
    <motion.ol
      aria-label="Itinerary stops"
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-0"
    >
      {legs.map((leg, index) => {
        const active = leg.placeId === activeId;
        const highlighted = active || leg.placeId === hoveredId;
        const previous = legs[index - 1];
        return (
          <motion.li key={leg.placeId} variants={item} className="relative pb-6 last:pb-0">
            {index < legs.length - 1 && (
              <motion.span
                aria-hidden="true"
                className="route-line-v absolute left-[13px] top-8 h-[calc(100%-2rem)] origin-top"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.25 + index * 0.09, duration: 0.5, ease: 'easeOut' }}
              />
            )}
            <button
              type="button"
              id={stopElementId(leg.placeId)}
              aria-pressed={active}
              aria-label={`Stop ${leg.order}: ${leg.name}. Show on map.`}
              onClick={() => onSelect?.(active ? null : leg.placeId)}
              onMouseEnter={() => onHover?.(leg.placeId)}
              onMouseLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(leg.placeId)}
              onBlur={() => onHover?.(null)}
              className={cn(
                'group -m-2 flex w-[calc(100%+1rem)] gap-4 rounded-lg p-2 text-left transition-all duration-200',
                active
                  ? 'bg-accent shadow-soft'
                  : highlighted
                    ? 'bg-accent/60'
                    : 'hover:bg-accent/40',
              )}
            >
              <span
                className={cn(
                  'waypoint relative z-10 transition-all duration-200 group-hover:scale-110',
                  active && 'bg-primary text-primary-foreground scale-110',
                )}
                aria-hidden="true"
              >
                {leg.order}
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block font-sans text-base font-semibold leading-snug">
                  {leg.name}
                </span>
                {leg.note && (
                  <span className="text-muted-foreground mt-1 block text-sm">{leg.note}</span>
                )}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {active && (
                <motion.div
                  key="nav"
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="overflow-hidden pl-11"
                >
                  <div className="space-y-2 pt-3">
                    <p className="text-secondary flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                      <Navigation className="h-3.5 w-3.5" aria-hidden="true" /> Get there
                    </p>
                    <NavLinks
                      label="From where you are"
                      google={googleToStopUrl(leg, travelMode)}
                      apple={appleToStopUrl(leg, travelMode)}
                    />
                    {previous && (
                      <NavLinks
                        label={`From stop ${previous.order}`}
                        google={googleToStopUrl(leg, travelMode, previous)}
                        apple={appleToStopUrl(leg, travelMode, previous)}
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
