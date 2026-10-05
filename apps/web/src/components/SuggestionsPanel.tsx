import { Plus, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useSuggestions } from '../hooks/useTrips';
import { describeError } from '../lib/errors';

import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

interface SuggestionsPanelProps {
  tripId: string;
  /** Name of the stop being replaced, or null when adding a new one. */
  replacing?: string | null;
  busy?: boolean;
  onPick: (placeId: string) => void;
  onClose: () => void;
}

/** Search for a place to add to the trip (or swap in for a stop), with picks to start from. */
export function SuggestionsPanel({
  tripId,
  replacing = null,
  busy = false,
  onPick,
  onClose,
}: SuggestionsPanelProps) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isPending, error, refetch } = useSuggestions(tripId, query);

  useEffect(() => inputRef.current?.focus(), []);
  // Wait for a pause in typing before searching.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(text.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [text]);

  const title = replacing ? `Swap out ${replacing}` : 'Add a stop';

  return (
    <section
      aria-label={title}
      className="border-input bg-card/80 shadow-soft mt-4 space-y-3 rounded-xl border p-3 backdrop-blur"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 h-4 w-4"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search places by name"
          aria-label="Search places by name"
          maxLength={80}
          className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border pl-8 pr-3 text-sm outline-none focus-visible:ring-2"
        />
      </div>

      {isPending ? (
        <div className="space-y-2" role="status" aria-label="Finding places">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : error ? (
        <p role="alert" className="text-destructive text-sm">
          {describeError(error).message}{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {query ? `Nothing matches "${query}".` : 'No more suggestions right now.'}
        </p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {data.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onPick(place.id)}
                aria-label={`${replacing ? 'Swap in' : 'Add'} ${place.name}`}
                className="hover:bg-accent focus-visible:ring-ring flex w-full items-start gap-3 rounded-lg p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
              >
                <Plus className="text-primary mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold">{place.name}</span>
                    <span className="text-muted-foreground text-xs capitalize">
                      {place.category}
                    </span>
                  </span>
                  {place.description && (
                    <span className="text-muted-foreground line-clamp-2 block text-xs">
                      {place.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
