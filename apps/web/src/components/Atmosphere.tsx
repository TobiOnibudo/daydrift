import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useMemo } from 'react';

import { cn } from '../lib/utils';

/** Small deterministic PRNG so the sky is identical on every render and in every test. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  warm: boolean;
}

const makeStars = (count: number): Star[] => {
  const rand = mulberry32(42);
  return Array.from({ length: count }, () => ({
    left: rand() * 100,
    top: rand() * 100,
    size: 1.5 + rand() * 2.5,
    delay: rand() * 6,
    duration: 3 + rand() * 4,
    warm: rand() < 0.25,
  }));
};

/** Points of a constellation in a 0-100 box, joined in order like the app's route line. */
const CONSTELLATIONS: Array<{ className: string; points: Array<[number, number]> }> = [
  {
    className: 'left-[0.5%] top-[18%]',
    points: [
      [10, 70],
      [34, 44],
      [58, 56],
      [84, 20],
      [96, 46],
    ],
  },
  {
    className: 'right-[0.5%] top-[56%]',
    points: [
      [8, 24],
      [30, 60],
      [56, 40],
      [78, 78],
      [94, 52],
    ],
  },
];

function Constellation({
  className,
  points,
}: {
  className: string;
  points: Array<[number, number]>;
}) {
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('absolute hidden h-32 w-32 overflow-visible xl:block', className)}
      fill="none"
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="0.6"
        strokeDasharray="1.5 2.5"
        className="animate-march text-primary/40"
      />
      {points.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="1.6"
          className="animate-twinkle fill-primary/70"
          style={{ animationDelay: `${i * 0.7}s`, transformOrigin: `${x}px ${y}px` }}
        />
      ))}
    </svg>
  );
}

/**
 * A quiet night sky behind the app: twinkling stars, a slow aurora, drifting constellations at the
 * edges, and now and then a shooting star. It parallaxes a few pixels with the mouse. Purely
 * decorative: hidden from assistive tech, inert to the pointer, and still when motion is reduced.
 */
export function Atmosphere() {
  const reduce = useReducedMotion();
  const stars = useMemo(() => makeStars(56), []);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const px = useSpring(pointerX, { stiffness: 50, damping: 20 });
  const py = useSpring(pointerY, { stiffness: 50, damping: 20 });
  // The aurora drifts further than the stars, which reads as depth.
  const auroraX = useTransform(px, (v) => v * 28);
  const auroraY = useTransform(py, (v) => v * 28);
  const starsX = useTransform(px, (v) => v * 10);
  const starsY = useTransform(py, (v) => v * 10);

  useEffect(() => {
    if (reduce) return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      pointerX.set((event.clientX / window.innerWidth - 0.5) * 2);
      pointerY.set((event.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce, pointerX, pointerY]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -inset-[10%]"
        style={reduce ? undefined : { x: auroraX, y: auroraY }}
      >
        <div className="animate-drift bg-primary/[0.07] dark:bg-primary/[0.09] absolute -left-10 top-0 h-[26rem] w-[26rem] rounded-full blur-3xl" />
        <div className="animate-drift bg-sand/80 dark:bg-sand/20 absolute right-0 top-1/4 h-[24rem] w-[24rem] rounded-full blur-3xl [animation-delay:-7s]" />
        <div className="animate-drift bg-sea/10 absolute bottom-0 left-1/3 h-[22rem] w-[22rem] rounded-full blur-3xl [animation-delay:-12s]" />
      </motion.div>

      <motion.div
        className="absolute inset-0"
        style={reduce ? undefined : { x: starsX, y: starsY }}
      >
        {stars.map((s, i) => (
          <span
            key={i}
            className={cn(
              'animate-twinkle absolute rounded-full',
              s.warm ? 'bg-primary/60' : 'bg-secondary/50',
            )}
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
        {CONSTELLATIONS.map((c) => (
          <Constellation key={c.className} {...c} />
        ))}
      </motion.div>

      <span className="animate-shoot via-primary/70 absolute left-[-10%] top-[12%] h-px w-28 rotate-[24deg] bg-gradient-to-r from-transparent to-transparent" />
    </div>
  );
}
