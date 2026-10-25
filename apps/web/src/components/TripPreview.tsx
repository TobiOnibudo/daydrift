import { Bike, Car, Footprints } from 'lucide-react';

import type { Duration, TravelMode } from '../lib/types';

import { MiniRoute } from './route/MiniRoute';

const MODES = {
  walking: { label: 'on foot', Icon: Footprints },
  cycling: { label: 'by bike', Icon: Bike },
  driving: { label: 'by car', Icon: Car },
} as const;

// Duration informs the pacing language; the traveler chooses the actual stop count.
const LENGTH = {
  '2h': 'a couple of hours',
  'half-day': 'half a day',
  'full-day': 'a full day',
} as const;

interface TripPreviewProps {
  cityName: string;
  duration: Duration;
  mode: TravelMode;
  interests: string[];
  stopCount: number;
  locationPreference: string;
}

/** A live sketch of the trip you are describing, so every choice visibly changes something. */
export function TripPreview({
  cityName,
  duration,
  mode,
  interests,
  stopCount,
  locationPreference,
}: TripPreviewProps) {
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
      <MiniRoute stops={Math.min(stopCount, 12)} Icon={Icon} />
      <p className="font-display text-lg font-semibold leading-tight">
        {cityName || 'Somewhere wonderful'}
      </p>
      <p className="text-muted-foreground text-sm">
        {length}, {stopCount} stops, {label}
        {interests.length > 0 && <> · {interests.join(', ')}</>}
        {locationPreference.trim() && <> · near {locationPreference.trim()}</>}
      </p>
    </section>
  );
}
