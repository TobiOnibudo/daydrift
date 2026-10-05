import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { ApiTrip } from '../lib/types';

import { RouteThumb } from './route/RouteThumb';
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
    <Card className="hover:border-primary/40 group flex items-center justify-between gap-4 p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <Link to={`/trips/${trip.id}`} className="flex min-w-0 flex-1 items-center gap-4 rounded-md">
        <RouteThumb
          legs={trip.legs}
          className="h-16 w-24 shrink-0 transition-transform duration-300 group-hover:scale-105"
        />
        <div className="min-w-0 flex-1">
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
