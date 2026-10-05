import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { Coffee, Palette, ShoppingBasket, Trees, type LucideIcon } from 'lucide-react';
import type { PointerEvent } from 'react';

import { cn } from '../../lib/utils';

import { RouteTrace, TRACE_STOPS, TRACE_VIEWBOX } from './RouteTrace';
import { TopoBackground } from './TopoBackground';

// Keep pins near the card edges inside it: anchor them toward the middle instead of centering.
const edge = (x: number) =>
  x / TRACE_VIEWBOX.width > 0.85
    ? '-translate-x-[85%]'
    : x / TRACE_VIEWBOX.width < 0.1
      ? '-translate-x-[15%]'
      : '-translate-x-1/2';

const PINS: Array<{ label: string; Icon: LucideIcon }> = [
  { label: 'Coffee', Icon: Coffee },
  { label: 'Gallery', Icon: Palette },
  { label: 'Park', Icon: Trees },
  { label: 'Market', Icon: ShoppingBasket },
];

/**
 * The landing-page centrepiece: a postcard of a city with a route drawing itself between four
 * stops, pins dropping onto each, and a traveler wandering the path. The card tilts gently
 * toward the pointer on devices that have one; everything is still when motion is reduced.
 */
export function HeroScene({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-7, 7]), {
    stiffness: 120,
    damping: 16,
  });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), {
    stiffness: 120,
    damping: 16,
  });

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduce || event.pointerType !== 'mouse') return;
    const box = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width - 0.5);
    py.set((event.clientY - box.top) / box.height - 0.5);
  };
  const onLeave = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div
      className={cn('[perspective:1100px]', className)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <motion.div
        style={reduce ? undefined : { rotateX, rotateY }}
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.15 }}
        className="bg-card/80 shadow-soft relative rounded-2xl border px-8 pb-5 pt-14 backdrop-blur [transform-style:preserve-3d]"
      >
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-2xl">
          <TopoBackground />
        </div>
        <div className="relative">
          <RouteTrace traveler />
          {/* Pins drop onto the stops as the route reaches them. */}
          {PINS.map(({ label, Icon }, i) => {
            const [x, y] = TRACE_STOPS[i]!;
            return (
              <motion.div
                key={label}
                className={cn('absolute -translate-y-full', edge(x))}
                style={{
                  left: `${(x / TRACE_VIEWBOX.width) * 100}%`,
                  top: `${(y / TRACE_VIEWBOX.height) * 100}%`,
                  paddingBottom: '1.1rem',
                }}
                initial={reduce ? false : { opacity: 0, y: -18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.6, type: 'spring', stiffness: 300, damping: 15 }}
              >
                <motion.span
                  className="bg-card shadow-soft flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                  animate={reduce ? undefined : { y: [0, -4, 0] }}
                  transition={{
                    duration: 3.2 + i * 0.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.3,
                  }}
                >
                  <Icon className="text-primary h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </motion.span>
              </motion.div>
            );
          })}
        </div>
        <p className="font-display text-muted-foreground relative mt-3 text-center text-sm italic">
          Four stops. One good day.
        </p>
      </motion.div>
    </div>
  );
}
