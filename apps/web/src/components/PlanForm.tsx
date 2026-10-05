import { Plus, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import type { CitySummary, CreateTripPayload, Duration, TravelMode } from '../lib/types';
import { cn } from '../lib/utils';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Segmented, type SegmentedOption } from './ui/segmented';

export const MAX_INTERESTS = 10;

const SUGGESTIONS = [
  'art',
  'coffee',
  'history',
  'parks',
  'food',
  'views',
  'theatre',
  'markets',
  'museums',
];

const DURATIONS: SegmentedOption<Duration>[] = [
  { value: '2h', label: 'A couple of hours', hint: '3 stops' },
  { value: 'half-day', label: 'Half a day', hint: '4-5 stops' },
  { value: 'full-day', label: 'A full day', hint: '5-6 stops' },
];

const MODES: SegmentedOption<TravelMode>[] = [
  { value: 'walking', label: 'On foot' },
  { value: 'cycling', label: 'By bike' },
  { value: 'driving', label: 'By car' },
];

interface PlanFormProps {
  cities: CitySummary[];
  submitting: boolean;
  error?: string | null;
  onSubmit: (payload: CreateTripPayload) => void;
}

export function PlanForm({ cities, submitting, error, onSubmit }: PlanFormProps) {
  const [city, setCity] = useState(cities[0]?.key ?? '');
  const [interests, setInterests] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [duration, setDuration] = useState<Duration>('half-day');
  const [mode, setMode] = useState<TravelMode>('walking');

  const atLimit = interests.length >= MAX_INTERESTS;

  const toggle = (interest: string) =>
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((i) => i !== interest)
        : current.length >= MAX_INTERESTS
          ? current
          : [...current, interest],
    );

  const addCustom = () => {
    const value = custom.trim().toLowerCase();
    if (value && !atLimit && !interests.includes(value)) setInterests([...interests, value]);
    setCustom('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!city || submitting) return;
    onSubmit({ city, interests, duration, travelMode: mode });
  };

  const chips = [...new Set([...SUGGESTIONS, ...interests])];

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <div className="space-y-2">
        <label htmlFor="city" className="text-sm font-medium">
          Where are you headed?
        </label>
        <select
          id="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="border-input bg-card flex h-11 w-full rounded-md border px-3 text-sm"
        >
          {cities.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name} ({c.placeCount} places)
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">What are you into?</legend>
        <p className="text-muted-foreground text-sm">
          Pick a few, or add your own. Leave it empty for a bit of everything.
        </p>
        <div className="flex flex-wrap gap-2">
          {chips.map((interest) => {
            const selected = interests.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                aria-pressed={selected}
                disabled={!selected && atLimit}
                onClick={() => toggle(interest)}
                className={cn(
                  'rounded-full border px-4 py-1.5 text-sm capitalize transition-colors disabled:opacity-40',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-card hover:bg-accent',
                )}
              >
                {interest}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input
            aria-label="Add your own interest"
            placeholder="Something else? e.g. street art"
            value={custom}
            maxLength={50}
            disabled={atLimit}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addCustom}
            disabled={!custom.trim() || atLimit}
          >
            <Plus aria-hidden="true" /> Add
          </Button>
        </div>
        {atLimit && (
          <Badge variant="outline">You have reached the limit of {MAX_INTERESTS} interests</Badge>
        )}
      </fieldset>

      <div className="space-y-2">
        <span className="text-sm font-medium">How long do you have?</span>
        <Segmented
          label="Trip length"
          value={duration}
          options={DURATIONS}
          onChange={setDuration}
        />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">How are you getting around?</span>
        <Segmented label="Travel mode" value={mode} options={MODES} onChange={setMode} />
      </div>

      {error && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!city || submitting}>
        <Sparkles aria-hidden="true" />
        {submitting ? 'Starting…' : 'Plan my trip'}
      </Button>
    </form>
  );
}
