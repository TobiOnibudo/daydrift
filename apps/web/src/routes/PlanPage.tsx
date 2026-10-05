import { useNavigate } from 'react-router-dom';

import { PlanForm } from '../components/PlanForm';
import { EmptyState, ErrorState } from '../components/states';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useCities, useCreateTrip } from '../hooks/useTrips';
import { ApiError } from '../lib/api';

export function PlanPage() {
  const cities = useCities();
  const create = useCreateTrip();
  const navigate = useNavigate();

  const error =
    create.error instanceof ApiError && create.error.status === 429
      ? 'You are planning a bit fast. Give it a minute and try again.'
      : create.error
        ? 'We could not start your trip. Please try again.'
        : null;

  return (
    <div className="container max-w-2xl py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-4xl font-semibold">Plan a trip</h1>
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
          description="Check your connection and try again."
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
          error={error}
          onSubmit={(payload) =>
            create.mutate(payload, { onSuccess: ({ tripId }) => navigate(`/trips/${tripId}`) })
          }
        />
      )}
    </div>
  );
}
