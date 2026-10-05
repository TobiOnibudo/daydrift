import { cloneElement, type InputHTMLAttributes, type ReactElement } from 'react';

import { cn } from '../../lib/utils';

interface FieldProps {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  className?: string;
  /** The control (an Input or select). It receives the id and the aria wiring. */
  children: ReactElement<InputHTMLAttributes<HTMLElement>>;
}

/** Label + control + hint/error with correct aria wiring, so errors are announced with the field. */
export function Field({ id, label, error, hint, className, children }: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
        className: cn(children.props.className, error && 'border-destructive'),
      })}
      {hint && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
