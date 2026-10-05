import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { ApiTrip } from '../lib/types';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';

const STATUS = {
  pending: { label: 'Queued', variant: 'outline' },
  processing: { label: 'Planning…', variant: 'outline' },
  complete: { label: 'Ready', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
} as const;

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

interface TripCardProps {
  trip: ApiTrip;
  onDelete: (trip: ApiTrip) => void;
  deleting?: boolean;
}

export function TripCard({ trip, onDelete, deleting = false }: TripCardProps) {
  const status = STATUS[trip.status];
  const title = trip.title ?? `${titleCase(trip.city)} trip`;
  const when = new Date(trip.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card className="flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-md">
      <Link to={`/trips/${trip.id}`} className="min-w-0 flex-1 rounded-md">
        <h3 className="font-display truncate text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {titleCase(trip.city)} · {when} · {trip.legs.length} stops
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={status.variant}>{status.label}</Badge>
          {trip.interests.slice(0, 3).map((i) => (
            <Badge key={i}>{i}</Badge>
          ))}
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(trip)}
        disabled={deleting}
        aria-label={`Delete ${title}`}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </Card>
  );
}
