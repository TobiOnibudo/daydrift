import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

import { pathThrough, routeThumbPoints, type GeoPoint } from '../../lib/route-thumb';
import { cn } from '../../lib/utils';

import { TopoBackground } from './TopoBackground';

const W = 120;
const H = 80;

/** A trip's actual route shape, drawn as little artwork on a contour-map tile. */
export function RouteThumb({ legs, className }: { legs: GeoPoint[]; className?: string }) {
  const reduce = useReducedMotion();
  const points = useMemo(() => routeThumbPoints(legs, W, H, 14), [legs]);
  const path = useMemo(() => pathThrough(points), [points]);

  return (
    <div
      aria-hidden="true"
      className={cn('bg-muted/50 relative overflow-hidden rounded-lg border', className)}
    >
      <TopoBackground rings={5} />
      <svg viewBox={`0 0 ${W} ${H}`} className="relative h-full w-full" fill="none">
        {points.length > 1 && (
          <motion.path
            d={path}
            stroke="hsl(var(--primary))"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1 5"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        )}
        {points.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={i === 0 || i === points.length - 1 ? 4.2 : 3}
            fill={i === points.length - 1 ? 'hsl(var(--secondary))' : 'hsl(var(--primary))'}
            stroke="hsl(var(--card))"
            strokeWidth="1.6"
            initial={reduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 320, damping: 16 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          />
        ))}
      </svg>
    </div>
  );
}
