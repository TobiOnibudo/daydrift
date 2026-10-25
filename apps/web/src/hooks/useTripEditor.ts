import { toast } from 'sonner';

import { MIN_STOPS } from '../lib/editing';
import { describeError } from '../lib/errors';
import type { ApiTrip } from '../lib/types';

import { useUpdateStops } from './useTrips';

export interface TripEditor {
  busy: boolean;
  canRemove: boolean;
  canAdd: boolean;
  move: (placeId: string, direction: -1 | 1) => void;
  remove: (placeId: string) => void;
  add: (placeId: string) => void;
  swap: (placeId: string, withId: string) => void;
}

/**
 * Manual edits to a finished trip. Every change is one save of the full ordered list, and each
 * confirmation offers Undo, which simply saves the list as it was.
 */
export function useTripEditor(trip: ApiTrip): TripEditor {
  const update = useUpdateStops(trip.id);
  const ids = trip.legs.map((leg) => leg.placeId);

  const fail = (error: unknown) => {
    const described = describeError(error);
    // A dead session has its own global message.
    if (described.kind !== 'session') toast.error(described.message);
  };

  const save = (next: string[], message: string) => {
    const before = ids;
    update.mutate(next, {
      onSuccess: () =>
        toast(message, {
          action: { label: 'Undo', onClick: () => update.mutate(before, { onError: fail }) },
        }),
      onError: fail,
    });
  };

  return {
    busy: update.isPending,
    canRemove: ids.length > MIN_STOPS,
    canAdd: true,
    move: (placeId, direction) => {
      const from = ids.indexOf(placeId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= ids.length) return;
      const next = [...ids];
      [next[from], next[to]] = [next[to]!, next[from]!];
      save(next, 'Stop moved');
    },
    remove: (placeId) => {
      if (ids.length <= MIN_STOPS) return;
      save(
        ids.filter((id) => id !== placeId),
        'Stop removed',
      );
    },
    add: (placeId) => {
      if (ids.includes(placeId)) return;
      save([...ids, placeId], 'Stop added');
    },
    swap: (placeId, withId) =>
      save(
        ids.map((id) => (id === placeId ? withId : id)),
        'Stop swapped',
      ),
  };
}
