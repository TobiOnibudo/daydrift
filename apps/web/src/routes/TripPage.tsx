import { Link2, Link2Off, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { TripGenerationView } from '../components/TripGenerationView';
import { TripResultView } from '../components/TripResultView';
import { ErrorState } from '../components/states';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useDeleteTrip, useRegenerateTrip, useShareTrip, useTrip } from '../hooks/useTrips';
import { ApiError } from '../lib/api';
import type { ApiTrip } from '../lib/types';

function TripActions({ trip, onRegenerate }: { trip: ApiTrip; onRegenerate: () => void }) {
  const navigate = useNavigate();
  const remove = useDeleteTrip();
  const { enable, disable } = useShareTrip(trip.id);
  const shareUrl = (token: string) => `${window.location.origin}/s/${token}`;

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      toast.success('Link copied. Anyone with it can view this trip.');
    } catch {
      toast.message('Copy this link to share', { description: shareUrl(token) });
    }
  };

  const handleShare = () =>
    trip.shareToken
      ? void copy(trip.shareToken)
      : enable.mutate(undefined, {
          onSuccess: (token) => void copy(token),
          onError: () => toast.error('Could not create a share link.'),
        });

  const handleDelete = () => {
    if (!window.confirm('Delete this trip? This cannot be undone.')) return;
    remove.mutate(trip.id, {
      onSuccess: () => {
        toast.success('Trip deleted');
        navigate('/trips');
      },
      onError: () => toast.error('Could not delete that trip.'),
    });
  };

  return (
    <>
      <Button variant="outline" onClick={handleShare} disabled={enable.isPending}>
        <Link2 aria-hidden="true" /> {trip.shareToken ? 'Copy share link' : 'Share'}
      </Button>
      {trip.shareToken && (
        <Button
          variant="ghost"
          onClick={() =>
            disable.mutate(undefined, { onSuccess: () => toast.success('Sharing turned off') })
          }
          disabled={disable.isPending}
        >
          <Link2Off aria-hidden="true" /> Stop sharing
        </Button>
      )}
      <Button variant="outline" onClick={onRegenerate}>
        <RotateCcw aria-hidden="true" /> Regenerate
      </Button>
      <Button variant="ghost" onClick={handleDelete} disabled={remove.isPending}>
        <Trash2 aria-hidden="true" /> Delete
      </Button>
    </>
  );
}

export function TripPage() {
  const { tripId = '' } = useParams();
  const { data: trip, isPending, error, refetch } = useTrip(tripId);
  const regenerate = useRegenerateTrip();
  // Bumping this remounts the generation view so it opens a fresh stream after a retry.
  const [attempt, setAttempt] = useState(0);

  const handleRegenerate = () =>
    regenerate.mutate(tripId, {
      onSuccess: () => setAttempt((n) => n + 1),
      onError: (e) =>
        toast.error(
          e instanceof ApiError && e.status === 409
            ? 'This trip is already being planned.'
            : 'Could not restart planning. Please try again.',
        ),
    });

  return (
    <div className="container py-10">
      <Link
        to="/trips"
        className="text-muted-foreground hover:text-foreground mb-6 inline-block text-sm"
      >
        ← All trips
      </Link>

      {isPending ? (
        <div className="space-y-4" role="status" aria-label="Loading trip">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : error ? (
        error instanceof ApiError && error.status === 404 ? (
          <ErrorState
            title="We can't find that trip"
            description="It may have been deleted, or it belongs to another account."
            action={
              <Button asChild>
                <Link to="/trips">Back to my trips</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            title="We couldn't load this trip"
            action={<Button onClick={() => void refetch()}>Retry</Button>}
          />
        )
      ) : trip.status === 'complete' ? (
        <TripResultView
          trip={trip}
          actions={<TripActions trip={trip} onRegenerate={handleRegenerate} />}
        />
      ) : trip.status === 'failed' ? (
        <ErrorState
          title="We couldn't finish planning this trip"
          description="Something went wrong on our side. Trying again usually works."
          action={
            <Button onClick={handleRegenerate} disabled={regenerate.isPending}>
              <RotateCcw aria-hidden="true" /> Try again
            </Button>
          }
        />
      ) : (
        <TripGenerationView
          key={attempt}
          tripId={tripId}
          onRetry={handleRegenerate}
          retrying={regenerate.isPending}
        />
      )}
    </div>
  );
}
