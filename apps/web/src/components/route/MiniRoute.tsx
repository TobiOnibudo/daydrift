import { motion, useAnimationFrame, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useRef } from 'react';

const W = 320;
const H = 60;

/** Stops spread across the width on a gentle wave, joined by the same S-curves as the big trace. */
export function miniRoutePoints(stops: number): Array<[number, number]> {
  const count = Math.max(2, stops);
  return Array.from({ length: count }, (_, i) => [
    24 + (i * (W - 48)) / (count - 1),
    H / 2 + Math.sin(i * 1.5) * 15,
  ]);
}

export function miniRoutePath(points: Array<[number, number]>): string {
  return points.reduce((d, [x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = points[i - 1] as [number, number];
    const mid = (px + x) / 2;
    return `${d} C ${mid} ${py}, ${mid} ${y}, ${x} ${y}`;
  }, '');
}

/**
 * A miniature of the trip being planned: as many stops as the chosen length will have, with the
 * chosen mode of transport travelling the route. It redraws whenever the stop count changes.
 */
export function MiniRoute({ stops, Icon }: { stops: number; Icon: LucideIcon }) {
  const reduce = useReducedMotion();
  const points = useMemo(() => miniRoutePoints(stops), [stops]);
  const d = useMemo(() => miniRoutePath(points), [points]);

  const pathRef = useRef<SVGPathElement>(null);
  const rider = useRef<SVGGElement>(null);

  useAnimationFrame((time) => {
    const path = pathRef.current;
    const el = rider.current;
    if (reduce || !path || !el || typeof path.getTotalLength !== 'function') return;
    const t = (time / 1000 / 7) % 1;
    const eased = 0.5 - Math.cos(t * Math.PI * 2) / 2;
    const p = path.getPointAtLength(eased * path.getTotalLength());
    el.setAttribute('transform', `translate(${p.x} ${p.y})`);
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="text-primary h-auto w-full overflow-visible"
      fill="none"
    >
      <motion.path
        key={stops}
        ref={pathRef}
        d={d}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="2 8"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      {points.map(([x, y], i) => (
        <motion.circle
          key={`${stops}-${i}`}
          cx={x}
          cy={y}
          r="6"
          className="fill-card stroke-current"
          strokeWidth="2.2"
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 360, damping: 15 }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      ))}
      <g ref={rider} transform={`translate(${points[0]?.[0] ?? 0} ${points[0]?.[1] ?? 0})`}>
        <circle r="13" className="fill-secondary stroke-card" strokeWidth="2.5" />
        <Icon x={-7} y={-7} width={14} height={14} className="text-secondary-foreground" />
      </g>
    </svg>
  );
}
