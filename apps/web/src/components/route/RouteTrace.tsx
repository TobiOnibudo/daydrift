import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '../../lib/utils';

interface RouteTraceProps {
  className?: string;
  /** Repeat the drawing animation (used while a trip is being generated). */
  loop?: boolean;
}

const PATH = 'M 20 150 C 90 150, 90 60, 170 70 S 260 150, 330 90 S 400 20, 460 40';
const STOPS: Array<[number, number]> = [
  [20, 150],
  [170, 70],
  [330, 90],
  [460, 40],
];

/**
 * The Daydrift signature: a dashed route line drawing itself between numbered waypoints.
 * Decorative only (aria-hidden); static when the user prefers reduced motion.
 */
export function RouteTrace({ className, loop = false }: RouteTraceProps) {
  const reduce = useReducedMotion();
  const animate = !reduce;

  return (
    <svg
      viewBox="0 0 480 180"
      aria-hidden="true"
      className={cn('text-primary h-auto w-full', className)}
      fill="none"
    >
      <motion.path
        d={PATH}
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
      {STOPS.map(([x, y], i) => (
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
    </svg>
  );
}
