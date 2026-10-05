import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useState } from 'react';

import { cn } from '../lib/utils';

interface SampleStop {
  id: string;
  time: string;
  name: string;
  note: string;
}

interface Scenario {
  id: string;
  label: string;
  guide: string;
  stops: SampleStop[];
}

const KENSINGTON: SampleStop = {
  id: 'kensington',
  time: '9:30',
  name: 'Kensington Market',
  note: 'Stalls, vintage shops and the best first coffee.',
};

// Everything here is sample copy: it shows how a day reshapes, it is not live data.
const SCENARIOS: Scenario[] = [
  {
    id: 'clear',
    label: 'All going well',
    guide:
      'Clear skies, so I kept you outside: coffee, a long green lawn, then the park at golden hour.',
    stops: [
      KENSINGTON,
      {
        id: 'trinity',
        time: '11:15',
        name: 'Trinity Bellwoods Park',
        note: 'A wide lawn made for a slow walk.',
      },
      {
        id: 'queen',
        time: '13:00',
        name: 'Queen Street West',
        note: 'Lunch between the murals and record shops.',
      },
      {
        id: 'highpark',
        time: '15:00',
        name: 'High Park',
        note: 'Finish under the trees, with time to spare.',
      },
    ],
  },
  {
    id: 'rain',
    label: "It's raining",
    guide:
      'Rain changes the plan, not the mood. I moved the park stops indoors and kept the coffee and lunch.',
    stops: [
      KENSINGTON,
      {
        id: 'rom',
        time: '11:15',
        name: 'Royal Ontario Museum',
        note: 'Dinosaurs and galleries, all under one roof.',
      },
      {
        id: 'queen',
        time: '13:00',
        name: 'Queen Street West',
        note: 'Lunch between the murals and record shops.',
      },
      {
        id: 'ago',
        time: '15:00',
        name: 'Art Gallery of Ontario',
        note: 'End with the Group of Seven, dry and warm.',
      },
    ],
  },
  {
    id: 'late',
    label: 'Running late',
    guide:
      'Starting later, so I dropped the park and kept the stops close. You still get the best of it.',
    stops: [
      { ...KENSINGTON, time: '10:45' },
      {
        id: 'queen',
        time: '12:30',
        name: 'Queen Street West',
        note: 'Lunch between the murals and record shops.',
      },
      {
        id: 'ago',
        time: '14:30',
        name: 'Art Gallery of Ontario',
        note: 'A short walk away, and worth the rest of the day.',
      },
    ],
  },
];

/**
 * A sample day that reshapes when you tell the guide what changed: the one thing Daydrift does
 * that a list of places cannot. Choosing a situation swaps and reorders the stops and rewrites
 * the guide's note, the same way the real trip page does.
 */
export function SampleDay({ className }: { className?: string }) {
  const [activeId, setActiveId] = useState(SCENARIOS[0]!.id);
  const scenario = SCENARIOS.find((s) => s.id === activeId) ?? SCENARIOS[0]!;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-secondary text-xs font-medium uppercase tracking-widest">
          A sample day in Toronto
        </p>
        <div role="group" aria-label="What changed?" className="flex flex-wrap gap-1.5">
          {SCENARIOS.map((s) => {
            const active = s.id === activeId;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveId(s.id)}
                className={cn(
                  'focus-visible:ring-ring rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card/70 hover:bg-accent',
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <LayoutGroup>
        <ol
          aria-label={`Sample itinerary: ${scenario.label}`}
          className="bg-card/80 shadow-soft rounded-2xl border p-2 backdrop-blur sm:p-3"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {scenario.stops.map((stop, index) => (
              <motion.li
                key={stop.id}
                layout="position"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className="relative flex gap-3 rounded-xl p-2"
              >
                {index < scenario.stops.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="route-line-v absolute bottom-[-0.5rem] left-[3.95rem] top-10"
                  />
                )}
                <time className="text-muted-foreground w-9 shrink-0 pt-1 text-right text-sm tabular-nums">
                  {stop.time}
                </time>
                <span className="waypoint relative z-10" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-base font-semibold leading-snug">{stop.name}</p>
                  <p className="text-muted-foreground text-sm leading-snug">{stop.note}</p>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </LayoutGroup>

      <div aria-live="polite" className="border-primary/50 min-h-[4.5rem] border-l-2 pl-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={scenario.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="font-display text-base italic leading-snug"
          >
            {scenario.guide}
          </motion.p>
        </AnimatePresence>
        <p className="text-muted-foreground mt-1 text-xs uppercase tracking-wider">Your guide</p>
      </div>
    </div>
  );
}
