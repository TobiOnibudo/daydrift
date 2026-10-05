import { cn } from '../../lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedProps<T extends string> {
  /** Accessible name for the group. */
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/** A single-choice radio group styled as segments. Native radios keep keyboard and screen-reader behavior. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid gap-2 sm:grid-flow-col', className)}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-background relative flex cursor-pointer flex-col rounded-lg border px-4 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2',
              checked
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-input bg-card hover:bg-accent/60',
            )}
          >
            <input
              type="radio"
              name={label}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="font-medium">{option.label}</span>
            {option.hint && (
              <span
                className={cn('text-xs', checked ? 'text-foreground/80' : 'text-muted-foreground')}
              >
                {option.hint}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
