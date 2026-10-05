import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

export const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div aria-hidden="true" className={cn('bg-muted shimmer rounded-md', className)} {...props} />
);
