import { useTripStream, type StreamStatus } from '../hooks/useTripStream';

// Maps the SSE generation stream to a single view (see docs/05-frontend.md §4).
// Presentational: receives the trip id, consumes useTripStream, renders the
// progress stepper + streaming narrative + skeletons until `complete`.

const STEPS: { status: StreamStatus; label: string }[] = [
  { status: 'finding-places', label: 'Finding places' },
  { status: 'building-itinerary', label: 'Building itinerary' },
  { status: 'routing', label: 'Routing' },
];

interface ProgressStepperProps {
  status: StreamStatus;
}

function ProgressStepper({ status }: ProgressStepperProps) {
  const activeIndex = STEPS.findIndex((step) => step.status === status);
  return (
    <ol className="flex gap-4">
      {STEPS.map((step, index) => (
        <li
          key={step.status}
          aria-current={step.status === status ? 'step' : undefined}
          className={index <= activeIndex ? 'font-semibold' : 'text-gray-400'}
        >
          {step.label}
        </li>
      ))}
    </ol>
  );
}

function Skeleton() {
  return <div className="h-24 w-full animate-pulse rounded bg-gray-200" aria-hidden="true" />;
}

interface TripGenerationViewProps {
  tripId: string;
  onRetry?: () => void;
}

export function TripGenerationView({ tripId, onRetry }: TripGenerationViewProps) {
  const { status, narrative, trip, error } = useTripStream(tripId);

  if (status === 'failed') {
    return (
      <div role="alert">
        <p>We couldn&apos;t finish planning this trip. {error}</p>
        {onRetry ? <button onClick={onRetry}>Try again</button> : null}
      </div>
    );
  }

  return (
    <section>
      <ProgressStepper status={status} />

      {/* Streaming narrative: word-by-word reveal, announced politely. */}
      <p aria-live="polite" className="mt-4 whitespace-pre-wrap">
        {narrative}
      </p>

      {/* Skeletons for itinerary/map until the final structured render. */}
      {status === 'complete' && trip ? (
        <div className="mt-4">{trip.title}</div>
      ) : (
        <div className="mt-4">
          <Skeleton />
        </div>
      )}
    </section>
  );
}
