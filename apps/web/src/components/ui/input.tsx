import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'border-input bg-card placeholder:text-muted-foreground flex h-11 w-full rounded-md border px-3 py-2 text-sm transition-colors focus-visible:bg-accent/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-sm disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
