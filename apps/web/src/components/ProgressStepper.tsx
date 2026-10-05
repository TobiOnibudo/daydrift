import { Check } from 'lucide-react';

import type { TripStep } from '../lib/types';
import { cn } from '../lib/utils';

export const STEPS: Array<{ step: TripStep; label: string }> = [
  { step: 'retrieving', label: 'Finding places' },
  { step: 'generating', label: 'Building your itinerary' },
  { step: 'routing', label: 'Mapping the route' },
];

interface ProgressStepperProps {
  /** The step currently running, or null before the first status arrives. */
  step: TripStep | null;
  /** True once the whole pipeline finished. */
  done?: boolean;
}

export function ProgressStepper({ step, done = false }: ProgressStepperProps) {
  const activeIndex = done ? STEPS.length : step ? STEPS.findIndex((s) => s.step === step) : -1;

  return (
    <ol aria-label="Trip planning progress" className="space-y-0">
      {STEPS.map((s, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li
            key={s.step}
            aria-current={active ? 'step' : undefined}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  'route-line-v absolute left-[13px] top-8 h-[calc(100%-2rem)]',
                  !complete && 'opacity-30',
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'waypoint relative z-10',
                complete && 'bg-primary text-primary-foreground',
                active && 'bg-accent animate-pulse',
                !complete && !active && 'border-input text-muted-foreground',
              )}
            >
              {complete ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span
              className={cn(
                'pt-1 text-sm',
                active ? 'font-semibold' : complete ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {s.label}
              <span className="sr-only">
                {complete ? ' (done)' : active ? ' (in progress)' : ' (waiting)'}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
