import { useMemo } from 'react';

import { cn } from '../../lib/utils';

interface TopoBackgroundProps {
  className?: string;
  /** Number of contour rings. */
  rings?: number;
}

/** A closed, gently wobbling contour: a circle whose radius is nudged by a few sine waves. */
function contour(cx: number, cy: number, radius: number, seed: number): string {
  const points = 72;
  const coords = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    const wobble =
      1 +
      0.1 * Math.sin(a * 3 + seed) +
      0.06 * Math.sin(a * 5 - seed * 1.7) +
      0.04 * Math.sin(a * 2 + seed * 0.6);
    return [cx + Math.cos(a) * radius * wobble * 1.25, cy + Math.sin(a) * radius * wobble];
  });
  return `M ${coords.map(([x, y]) => `${x!.toFixed(1)} ${y!.toFixed(1)}`).join(' L ')} Z`;
}

/**
 * Topographic contour lines, like a hiking map, drifting almost imperceptibly. Pure decoration:
 * the motion is a 90-second CSS transform and is switched off for reduced-motion users.
 */
export function TopoBackground({ className, rings = 9 }: TopoBackgroundProps) {
  const paths = useMemo(
    () => Array.from({ length: rings }, (_, i) => contour(300, 200, 28 + i * 24, i * 0.9)),
    [rings],
  );

  return (
    <svg
      viewBox="0 0 600 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      fill="none"
    >
      <g className="animate-topo stroke-secondary/25 origin-center" strokeWidth="1.2">
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
