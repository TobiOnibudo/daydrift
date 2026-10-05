import { motion, useAnimationFrame, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

import { cn } from '../../lib/utils';

interface RouteTraceProps {
  className?: string;
  /** Repeat the drawing animation (used while a trip is being generated). */
  loop?: boolean;
  /** A small traveler that wanders along the route forever. */
  traveler?: boolean;
}

export const TRACE_PATH = 'M 20 150 C 90 150, 90 60, 170 70 S 260 150, 330 90 S 400 20, 460 40';
export const TRACE_STOPS: Array<[number, number]> = [
  [20, 150],
  [170, 70],
  [330, 90],
  [460, 40],
];
export const TRACE_VIEWBOX = { width: 480, height: 180 };

const LAP_SECONDS = 9;

/**
 * The Daydrift signature: a dashed route line drawing itself between numbered waypoints, with an
 * optional traveler drifting along it. Decorative only (aria-hidden); static when the user
 * prefers reduced motion.
 */
export function RouteTrace({ className, loop = false, traveler = false }: RouteTraceProps) {
  const reduce = useReducedMotion();
  const animate = !reduce;
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const length = useRef(0);

  // Move the traveler by writing straight to the DOM, so it costs no React renders.
  useAnimationFrame((time) => {
    const path = pathRef.current;
    const dot = dotRef.current;
    if (!traveler || !animate || !path || !dot || typeof path.getTotalLength !== 'function') return;
    length.current ||= path.getTotalLength();
    // Ease in and out of each lap so the traveler lingers at the ends like it is sightseeing.
    const t = (time / 1000 / LAP_SECONDS) % 1;
    const eased = 0.5 - Math.cos(t * Math.PI * 2) / 2;
    const point = path.getPointAtLength(eased * length.current);
    dot.setAttribute('transform', `translate(${point.x} ${point.y})`);
  });

  return (
    <svg
      viewBox={`0 0 ${TRACE_VIEWBOX.width} ${TRACE_VIEWBOX.height}`}
      aria-hidden="true"
      className={cn('text-primary h-auto w-full overflow-visible', className)}
      fill="none"
    >
      <motion.path
        ref={pathRef}
        d={TRACE_PATH}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 10"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{
          duration: 2.4,
          ease: 'easeInOut',
          repeat: loop && animate ? Infinity : 0,
          repeatDelay: 1,
        }}
      />
      {TRACE_STOPS.map(([x, y], i) => (
        <motion.g
          key={i}
          initial={animate ? { opacity: 0, scale: 0.4 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: animate ? 0.4 + i * 0.6 : 0,
            type: 'spring',
            stiffness: 260,
            damping: 18,
          }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        >
          <circle cx={x} cy={y} r="13" className="fill-card stroke-current" strokeWidth="2.5" />
          <text
            x={x}
            y={y + 4.5}
            textAnchor="middle"
            className="fill-current font-sans text-[13px] font-semibold"
          >
            {i + 1}
          </text>
        </motion.g>
      ))}
      {traveler && animate && (
        <g ref={dotRef} transform="translate(20 150)">
          <circle r="11" className="fill-secondary/20">
            <animate attributeName="r" values="8;13;8" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle r="5" className="fill-secondary stroke-card" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
