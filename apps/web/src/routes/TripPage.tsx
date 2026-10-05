import { Link2, Link2Off, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Celebrate } from '../components/Celebrate';
import { TripGenerationView } from '../components/TripGenerationView';
import { TripResultView } from '../components/TripResultView';
import { ErrorState } from '../components/states';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useDeleteTrip, useRegenerateTrip, useShareTrip, useTrip } from '../hooks/useTrips';
import { ApiError } from '../lib/api';
import { describeError } from '../lib/errors';
import type { ApiTrip } from '../lib/types';

/** Show a failure as a toast, unless it is a dead session (handled globally with its own message). */
const toastError = (error: unknown, fallback?: string) => {
  const described = describeError(error);
  if (described.kind !== 'session') toast.error(fallback ?? described.message);
};

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
      // Clipboard access can be blocked (permissions, insecure context): show the link instead.
      toast.message('Copy this link to share', { description: shareUrl(token), duration: 15_000 });
    }
  };

  const handleShare = () =>
    trip.shareToken
      ? void copy(trip.shareToken)
      : enable.mutate(undefined, {
          onSuccess: (token) => void copy(token),
          onError: (e) => toastError(e, "We couldn't create a share link. Please try again."),
        });

  const handleStopSharing = () =>
    disable.mutate(undefined, {
      onSuccess: () => toast.success('Sharing turned off'),
      onError: (e) => toastError(e, "We couldn't turn sharing off. Please try again."),
    });

  const handleDelete = () => {
    if (!window.confirm('Delete this trip? This cannot be undone.')) return;
    remove.mutate(trip.id, {
      onSuccess: () => {
        toast.success('Trip deleted');
        navigate('/trips');
      },
      onError: (e) => toastError(e, "We couldn't delete that trip. Please try again."),
    });
  };

  return (
    <>
      <Button variant="outline" onClick={handleShare} disabled={enable.isPending}>
        <Link2 aria-hidden="true" /> {trip.shareToken ? 'Copy share link' : 'Share'}
      </Button>
      {trip.shareToken && (
        <Button variant="ghost" onClick={handleStopSharing} disabled={disable.isPending}>
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
        toastError(
          e,
          e instanceof ApiError && e.status === 409
            ? 'This trip is already being planned.'
            : "We couldn't restart planning. Please try again.",
        ),
    });

  // A malformed id is answered with 400 and an unknown or foreign one with 404: both mean "not yours".
  const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);

  const finished = !isPending && !error && trip.status === 'complete';

  // Celebrate only when the person watched this trip get planned, not when they just reopen it.
  const waited = useRef(false);
  const [celebrate, setCelebrate] = useState(false);
  const status = trip?.status;
  useEffect(() => {
    if (status === 'pending' || status === 'processing') waited.current = true;
    if (status === 'complete' && waited.current) {
      waited.current = false;
      setCelebrate(true);
      const timer = window.setTimeout(() => setCelebrate(false), 2600);
      return () => window.clearTimeout(timer);
    }
  }, [status]);
  const back = (
    <Link
      to="/trips"
      className="text-muted-foreground hover:text-foreground inline-block text-sm transition-colors"
    >
      ← All trips
    </Link>
  );

  return (
    <div className={finished ? 'container max-w-[96rem] py-3' : 'container py-10'}>
      {celebrate && <Celebrate />}
      {!finished && <div className="mb-6">{back}</div>}

      {isPending ? (
        <div className="space-y-4" role="status" aria-label="Loading trip">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : error ? (
        notFound ? (
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
            description={describeError(error).message}
            action={<Button onClick={() => void refetch()}>Retry</Button>}
          />
        )
      ) : trip.status === 'complete' ? (
        <TripResultView
          trip={trip}
          back={back}
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
