import { motion } from 'framer-motion';

import type { TripLeg } from '../lib/types';

interface ItineraryListProps {
  legs: TripLeg[];
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

/** The itinerary as a timeline on the signature route line. */
export function ItineraryList({ legs }: ItineraryListProps) {
  return (
    <motion.ol
      aria-label="Itinerary stops"
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-0"
    >
      {legs.map((leg, index) => (
        <motion.li key={leg.placeId} variants={item} className="relative flex gap-4 pb-7 last:pb-0">
          {index < legs.length - 1 && (
            <span
              aria-hidden="true"
              className="route-line-v absolute left-[13px] top-8 h-[calc(100%-2rem)]"
            />
          )}
          <span className="waypoint relative z-10" aria-hidden="true">
            {leg.order}
          </span>
          <div className="min-w-0 pt-0.5">
            <h3 className="font-sans text-base font-semibold leading-snug">
              <span className="sr-only">Stop {leg.order}: </span>
              {leg.name}
            </h3>
            {leg.note && <p className="text-muted-foreground mt-1 text-sm">{leg.note}</p>}
          </div>
        </motion.li>
      ))}
    </motion.ol>
  );
}
