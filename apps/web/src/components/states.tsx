import { motion } from 'framer-motion';
import { AlertTriangle, Compass } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../lib/utils';

interface StateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** A friendly, actionable error region. `role="alert"` so assistive tech announces it. */
export function ErrorState({ title, description, action, className }: StateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/30 bg-destructive/5 flex flex-col items-center gap-3 rounded-lg border px-6 py-10 text-center',
        className,
      )}
    >
      <AlertTriangle className="text-destructive h-8 w-8" aria-hidden="true" />
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="text-muted-foreground max-w-md text-sm">{description}</p>}
      {action}
    </div>
  );
}

export function EmptyState({ title, description, action, className }: StateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      <motion.span
        aria-hidden="true"
        animate={{ rotate: [0, 16, -12, 0], y: [0, -3, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Compass className="text-primary h-8 w-8" />
      </motion.span>
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && <p className="text-muted-foreground max-w-md text-sm">{description}</p>}
      {action}
    </div>
  );
}
