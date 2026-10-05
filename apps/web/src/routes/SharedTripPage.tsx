import { Link, useParams } from 'react-router-dom';

import { TripResultView } from '../components/TripResultView';
import { ErrorState } from '../components/states';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useSharedTrip } from '../hooks/useTrips';
import { ApiError } from '../lib/api';
import { describeError } from '../lib/errors';

/** Public, read-only view of a trip someone shared. No account needed. */
export function SharedTripPage() {
  const { token = '' } = useParams();
  const { data: trip, isPending, error, refetch } = useSharedTrip(token);
  const gone = error instanceof ApiError && [400, 404].includes(error.status);

  return (
    <div className="container max-w-[96rem] py-3">
      {isPending ? (
        <div className="space-y-4" role="status" aria-label="Loading shared trip">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : error ? (
        gone ? (
          <ErrorState
            title="This link isn't available"
            description="The trip may have been removed, or sharing was turned off."
            action={
              <Button asChild>
                <Link to="/">Go to Daydrift</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            title="We couldn't load this trip"
            description={describeError(error).message}
            action={<Button onClick={() => void refetch()}>Retry</Button>}
          />
        )
      ) : (
        <>
          <TripResultView trip={trip} />
          <aside className="bg-accent/50 mt-12 flex flex-col items-center gap-3 rounded-lg border px-6 py-8 text-center">
            <h2 className="text-2xl font-semibold">Want a day like this of your own?</h2>
            <Button asChild size="lg">
              <Link to="/plan">Plan your own trip</Link>
            </Button>
          </aside>
        </>
      )}
    </div>
  );
}
