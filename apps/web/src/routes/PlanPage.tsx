import { useNavigate } from 'react-router-dom';

import { PlanForm } from '../components/PlanForm';
import { EmptyState, ErrorState } from '../components/states';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useCities, useCreateTrip } from '../hooks/useTrips';
import { describeError } from '../lib/errors';

export function PlanPage() {
  const cities = useCities();
  const create = useCreateTrip();
  const navigate = useNavigate();

  const problem = create.error ? describeError(create.error) : null;
  // A dead session is handled globally (redirect to sign in); don't also flash a form error.
  const showProblem = problem && problem.kind !== 'session';

  return (
    <div className="container max-w-5xl py-6 lg:py-5">
      <header className="mb-5 space-y-1 lg:mb-4">
        <h1 className="text-3xl font-semibold sm:text-4xl">Plan a trip</h1>
        <p className="text-muted-foreground">Tell us the vibe and we will build the day.</p>
      </header>

      {cities.isPending ? (
        <div className="space-y-4" role="status" aria-label="Loading cities">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : cities.isError ? (
        <ErrorState
          title="We couldn't load the cities"
          description={describeError(cities.error).message}
          action={<Button onClick={() => void cities.refetch()}>Retry</Button>}
        />
      ) : cities.data.length === 0 ? (
        <EmptyState
          title="No cities are ready yet"
          description="Places are still being added. Please check back soon."
        />
      ) : (
        <PlanForm
          cities={cities.data}
          submitting={create.isPending}
          error={showProblem ? problem.message : null}
          fieldErrors={showProblem ? problem.fieldErrors : {}}
          onSubmit={(payload) =>
            create.mutate(payload, { onSuccess: ({ tripId }) => navigate(`/trips/${tripId}`) })
          }
        />
      )}
    </div>
  );
}
