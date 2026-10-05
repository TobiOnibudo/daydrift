import { Bike, Car, Footprints } from 'lucide-react';

import type { Duration, TravelMode } from '../lib/types';

import { MiniRoute } from './route/MiniRoute';

const MODES = {
  walking: { label: 'on foot', Icon: Footprints },
  cycling: { label: 'by bike', Icon: Bike },
  driving: { label: 'by car', Icon: Car },
} as const;

// How many stops the model is asked for at each length (mirrors the server's stop ranges).
const LENGTH = {
  '2h': { nodes: 3, text: 'a couple of hours, 3 stops' },
  'half-day': { nodes: 5, text: 'half a day, 4-5 stops' },
  'full-day': { nodes: 6, text: 'a full day, 5-6 stops' },
} as const;

interface TripPreviewProps {
  cityName: string;
  duration: Duration;
  mode: TravelMode;
  interests: string[];
}

/** A live sketch of the trip you are describing, so every choice visibly changes something. */
export function TripPreview({ cityName, duration, mode, interests }: TripPreviewProps) {
  const { Icon, label } = MODES[mode];
  const length = LENGTH[duration];

  return (
    <section
      aria-label="Your trip so far"
      className="bg-card/80 shadow-soft rounded-xl border px-4 py-3 backdrop-blur"
    >
      <p className="text-secondary text-xs font-medium uppercase tracking-wider">
        Your trip so far
      </p>
      <MiniRoute stops={length.nodes} Icon={Icon} />
      <p className="font-display text-lg font-semibold leading-tight">
        {cityName || 'Somewhere wonderful'}
      </p>
      <p className="text-muted-foreground text-sm">
        {length.text}, {label}
        {interests.length > 0 && <> · {interests.join(', ')}</>}
      </p>
    </section>
  );
}
