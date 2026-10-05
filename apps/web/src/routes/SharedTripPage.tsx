import { Link, useParams } from 'react-router-dom';

import { TripResultView } from '../components/TripResultView';
import { ErrorState } from '../components/states';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useSharedTrip } from '../hooks/useTrips';

/** Public, read-only view of a trip someone shared. No account needed. */
export function SharedTripPage() {
  const { token = '' } = useParams();
  const { data: trip, isPending, isError } = useSharedTrip(token);

  return (
    <div className="container py-10">
      {isPending ? (
        <div className="space-y-4" role="status" aria-label="Loading shared trip">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : isError ? (
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
