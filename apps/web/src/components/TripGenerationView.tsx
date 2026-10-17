import { RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
  /** The guide is revising a finished trip, so a failure leaves the trip as it was. */
  revising?: boolean;
  /** Called once when the stream ends, so the page can tell the person how it went. */
  onFinished?: (outcome: { ok: true } | { ok: false; message: string }) => void;
}

const SLOW_HINT_AFTER_MS = 20_000;

/** Maps the SSE stream to one view (docs/05 §4): stepper, live narrative, and skeletons until done. */
export function TripGenerationView({
  tripId,
  onRetry,
  retrying = false,
  revising = false,
  onFinished,
}: TripGenerationViewProps) {
  const stream = useTripStream(tripId);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_HINT_AFTER_MS);
    return () => clearTimeout(timer);
  }, [tripId]);

  const { phase, error } = stream;
  // The latest callback is read when the stream ends, so a new function identity never re-reports.
  const finished = useRef(onFinished);
  useEffect(() => {
    finished.current = onFinished;
  }, [onFinished]);
  useEffect(() => {
    if (phase === 'complete') finished.current?.({ ok: true });
    if (phase === 'failed') finished.current?.({ ok: false, message: error ?? '' });
  }, [phase, error]);

  if (phase === 'failed' && !revising) {
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
        <RouteTrace loop traveler className="opacity-90" />
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
            {revising ? 'Your guide is rethinking the day' : 'From your guide'}
          </h2>
          <StreamingNarrative text={stream.narrative} streaming={stream.phase === 'streaming'} />
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
