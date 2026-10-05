import { RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useTripStream } from '../hooks/useTripStream';

import { ProgressStepper } from './ProgressStepper';
import { StreamingNarrative } from './StreamingNarrative';
import { RouteTrace } from './route/RouteTrace';
import { ErrorState } from './states';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';

interface TripGenerationViewProps {
  tripId: string;
  onRetry: () => void;
  retrying?: boolean;
}

const SLOW_HINT_AFTER_MS = 20_000;

/** Maps the SSE stream to one view (docs/05 §4): stepper, live narrative, and skeletons until done. */
export function TripGenerationView({ tripId, onRetry, retrying = false }: TripGenerationViewProps) {
  const stream = useTripStream(tripId);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_HINT_AFTER_MS);
    return () => clearTimeout(timer);
  }, [tripId]);

  if (stream.phase === 'failed') {
    return (
      <ErrorState
        title="We couldn't finish planning this trip"
        description={stream.error ?? 'Something went wrong on our side.'}
        action={
          <Button onClick={onRetry} disabled={retrying}>
            <RotateCcw aria-hidden="true" /> Try again
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <Card className="h-fit space-y-6 p-6">
        <RouteTrace loop className="opacity-90" />
        <ProgressStepper step={stream.step} done={stream.phase === 'complete'} />
        {slow && (
          <p className="text-muted-foreground text-xs">
            Still working. Great itineraries can take a minute or two.
          </p>
        )}
      </Card>

      <div className="space-y-6">
        <Card className="space-y-3 p-6">
          <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
            From your guide
          </h2>
          <StreamingNarrative text={stream.narrative} />
        </Card>

        <div className="space-y-3" role="status" aria-label="Preparing your itinerary">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
