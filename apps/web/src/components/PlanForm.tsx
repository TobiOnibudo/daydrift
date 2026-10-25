import { Plus, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import type { CitySummary, CreateTripPayload, Duration, TravelMode } from '../lib/types';
import { cn } from '../lib/utils';
import { MAX_INTEREST_LENGTH, MAX_INTERESTS, validateInterest } from '../lib/validation';

import { TripPreview } from './TripPreview';
import { Button } from './ui/button';
import { Field } from './ui/field';
import { Input } from './ui/input';
import { Segmented, type SegmentedOption } from './ui/segmented';

export { MAX_INTERESTS };

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
  { value: '2h', label: 'A couple of hours' },
  { value: 'half-day', label: 'Half a day' },
  { value: 'full-day', label: 'A full day' },
];

const MIN_STOP_COUNT = 2;

const MODES: SegmentedOption<TravelMode>[] = [
  { value: 'walking', label: 'On foot' },
  { value: 'cycling', label: 'By bike' },
  { value: 'driving', label: 'By car' },
];

interface PlanFormProps {
  cities: CitySummary[];
  submitting: boolean;
  /** A summary of what went wrong with the last submission. */
  error?: string | null;
  /** Server-reported problems, shown next to the field they belong to. */
  fieldErrors?: Partial<
    Record<
      'city' | 'interests' | 'duration' | 'travelMode' | 'stopCount' | 'locationPreference',
      string
    >
  >;
  onSubmit: (payload: CreateTripPayload) => void;
}

export function PlanForm({ cities, submitting, error, fieldErrors = {}, onSubmit }: PlanFormProps) {
  const [city, setCity] = useState(cities[0]?.key ?? '');
  const [interests, setInterests] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [duration, setDuration] = useState<Duration>('half-day');
  const [mode, setMode] = useState<TravelMode>('walking');
  const [stopCount, setStopCount] = useState(5);
  const [stopCountDraft, setStopCountDraft] = useState('5');
  const [locationPreference, setLocationPreference] = useState('');
  const summaryRef = useRef<HTMLParagraphElement>(null);

  const atLimit = interests.length >= MAX_INTERESTS;
  const typedStopCount = Number(stopCountDraft);
  const hasValidStopCount =
    Number.isSafeInteger(typedStopCount) && typedStopCount >= MIN_STOP_COUNT;

  // Move focus to the summary when a submission fails, so the message is announced and reachable.
  useEffect(() => {
    if (error) summaryRef.current?.focus();
  }, [error]);

  const toggle = (interest: string) => {
    setCustomError(null);
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((i) => i !== interest)
        : current.length >= MAX_INTERESTS
          ? current
          : [...current, interest],
    );
  };

  const addCustom = () => {
    if (!custom.trim()) {
      setCustomError(validateInterest(custom, interests));
      return;
    }
    const problem = validateInterest(custom, interests);
    if (problem) {
      setCustomError(problem);
      return;
    }
    setInterests([...interests, custom.trim().toLowerCase()]);
    setCustom('');
    setCustomError(null);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!city || submitting) return;
    onSubmit({ city, interests, duration, travelMode: mode, stopCount, locationPreference });
  };

  const chips = [...new Set([...SUGGESTIONS, ...interests])];

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:space-y-0"
      noValidate
    >
      {error && (
        <p
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm"
        >
          {error}
        </p>
      )}

      <div className="space-y-6">
        <Field id="city" label="Where are you headed?" error={fieldErrors.city}>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border-input bg-card focus-visible:bg-accent/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-sm flex h-11 w-full rounded-md border px-3 text-sm transition-colors"
          >
            {cities.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name} ({c.placeCount} places)
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="location-preference"
          label="Any neighbourhood or landmark to stay near?"
          hint="Optional — we’ll prioritize suggestions there first."
          error={fieldErrors.locationPreference}
        >
          <Input
            value={locationPreference}
            maxLength={100}
            placeholder="e.g. near the waterfront or Kensington Market"
            onChange={(e) => setLocationPreference(e.target.value)}
          />
        </Field>

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
                      ? 'chip-pop border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-card hover:bg-accent',
                  )}
                >
                  {interest}
                </button>
              );
            })}
          </div>

          <div className="flex items-start gap-2">
            <Field
              id="custom-interest"
              label="Add your own interest"
              error={customError ?? fieldErrors.interests}
              hint={
                atLimit
                  ? `You have reached the limit of ${MAX_INTERESTS} interests.`
                  : `${interests.length} of ${MAX_INTERESTS} chosen`
              }
              className="flex-1"
            >
              <Input
                placeholder="Something else? e.g. street art"
                value={custom}
                maxLength={MAX_INTEREST_LENGTH + 20}
                disabled={atLimit}
                onChange={(e) => {
                  setCustom(e.target.value);
                  if (customError) setCustomError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustom();
                  }
                }}
              />
            </Field>
            <Button
              type="button"
              variant="outline"
              onClick={addCustom}
              disabled={atLimit}
              className="mt-[1.625rem]"
            >
              <Plus aria-hidden="true" /> Add
            </Button>
          </div>
        </fieldset>
      </div>

      <div className="space-y-6">
        <TripPreview
          cityName={cities.find((c) => c.key === city)?.name ?? ''}
          duration={duration}
          mode={mode}
          interests={interests}
          stopCount={stopCount}
          locationPreference={locationPreference}
        />
        <div className="border-border space-y-2 border-b pb-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <label htmlFor="stop-count" className="text-sm font-medium">
                How many stops would you like?
              </label>
              <p id="stop-count-hint" className="text-muted-foreground text-xs">
                2 minimum · Longer plans include a lunch or break.
              </p>
            </div>
            <Input
              id="stop-count"
              type="number"
              min={MIN_STOP_COUNT}
              step={1}
              inputMode="numeric"
              aria-invalid={fieldErrors.stopCount ? true : undefined}
              aria-describedby={
                fieldErrors.stopCount ? 'stop-count-hint stop-count-error' : 'stop-count-hint'
              }
              className="w-20 shrink-0 text-center font-semibold tabular-nums"
              value={stopCountDraft}
              onChange={(e) => {
                const draft = e.target.value;
                setStopCountDraft(draft);
                const value = Number(draft);
                if (Number.isSafeInteger(value) && value >= MIN_STOP_COUNT) setStopCount(value);
              }}
              onBlur={() => setStopCountDraft(String(stopCount))}
            />
          </div>
          {fieldErrors.stopCount && (
            <p id="stop-count-error" className="text-destructive text-sm">
              {fieldErrors.stopCount}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium">How long do you have?</span>
          <Segmented
            label="Trip length"
            value={duration}
            options={DURATIONS}
            onChange={setDuration}
          />
          {fieldErrors.duration && (
            <p className="text-destructive text-sm">{fieldErrors.duration}</p>
          )}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">How are you getting around?</span>
          <Segmented label="Travel mode" value={mode} options={MODES} onChange={setMode} />
          {fieldErrors.travelMode && (
            <p className="text-destructive text-sm">{fieldErrors.travelMode}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={!city || submitting || !hasValidStopCount}
        >
          <Sparkles aria-hidden="true" />
          {submitting ? 'Starting…' : 'Plan my trip'}
        </Button>
      </div>
    </form>
  );
}
