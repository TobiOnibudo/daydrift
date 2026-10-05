import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { SectionTitle } from '../components/SectionTitle';
import { TripCard } from '../components/TripCard';
import { EmptyState, ErrorState } from '../components/states';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useDeleteTrip, useTrips } from '../hooks/useTrips';
import { describeError } from '../lib/errors';
import type { ApiTrip } from '../lib/types';

export function TripsPage() {
  const trips = useTrips();
  const remove = useDeleteTrip();

  const handleDelete = (trip: ApiTrip) => {
    const name = trip.title ?? `${trip.city} trip`;
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
    remove.mutate(trip.id, {
      onSuccess: () => toast.success('Trip deleted'),
      onError: (e) => {
        const described = describeError(e);
        if (described.kind !== 'session')
          toast.error("We couldn't delete that trip. Please try again.");
      },
    });
  };

  return (
    <div className="container max-w-3xl py-8">
      <header className="mb-8 flex items-end justify-between gap-4">
        <SectionTitle title="My trips" />
        <Button asChild>
          <Link to="/plan">
            <Plus aria-hidden="true" /> New trip
          </Link>
        </Button>
      </header>

      {trips.isPending ? (
        <div className="space-y-3" role="status" aria-label="Loading your trips">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : trips.isError ? (
        <ErrorState
          title="We couldn't load your trips"
          description={describeError(trips.error).message}
          action={<Button onClick={() => void trips.refetch()}>Retry</Button>}
        />
      ) : trips.data.length === 0 ? (
        <EmptyState
          title="No trips yet"
          description="Your planned days will show up here."
          action={
            <Button asChild>
              <Link to="/plan">Plan your first trip</Link>
            </Button>
          }
        />
      ) : (
        <motion.ul
          className="space-y-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        >
          {trips.data.map((trip) => (
            <motion.li
              key={trip.id}
              variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
            >
              <TripCard
                trip={trip}
                onDelete={handleDelete}
                deleting={remove.isPending && remove.variables === trip.id}
              />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}
