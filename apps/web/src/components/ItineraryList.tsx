import { motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';

import type { TripLeg } from '../lib/types';
import { cn } from '../lib/utils';

interface ItineraryListProps {
  legs: TripLeg[];
  /** The selected stop. Pressing it again clears the selection. */
  activeId?: string | null;
  hoveredId?: string | null;
  onSelect?: (placeId: string | null) => void;
  onHover?: (placeId: string | null) => void;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const stopElementId = (placeId: string) => `stop-${placeId}`;

/**
 * The itinerary as a timeline on the signature route line. Each stop is a button linked to its
 * marker on the map: activate it to fly there, hover or focus it to highlight the marker.
 */
export function ItineraryList({
  legs,
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
        return (
          <motion.li key={leg.placeId} variants={item} className="relative pb-7 last:pb-0">
            {index < legs.length - 1 && (
              <span
                aria-hidden="true"
                className="route-line-v absolute left-[13px] top-8 h-[calc(100%-2rem)]"
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
                '-m-2 flex w-[calc(100%+1rem)] gap-4 rounded-lg p-2 text-left transition-colors',
                active ? 'bg-accent' : highlighted ? 'bg-accent/60' : 'hover:bg-accent/40',
              )}
            >
              <span
                className={cn(
                  'waypoint relative z-10 transition-colors',
                  active && 'bg-primary text-primary-foreground',
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
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
