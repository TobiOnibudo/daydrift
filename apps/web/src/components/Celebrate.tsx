import { motion, useReducedMotion } from 'framer-motion';
import { Sparkle } from 'lucide-react';

const COUNT = 22;

/** A one-off burst of stars when a trip finishes planning. Renders nothing under reduced motion. */
export function Celebrate() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2 + (i % 2) * 0.15;
        const distance = 140 + (i % 5) * 46;
        return (
          <motion.span
            key={i}
            className="text-primary absolute left-1/2 top-[34%]"
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance + 40,
              scale: [0, 1.3, 0.7],
              opacity: [1, 1, 0],
              rotate: 160,
            }}
            transition={{ duration: 1.5 + (i % 3) * 0.2, ease: 'easeOut', delay: i * 0.012 }}
          >
            <Sparkle
              className={
                i % 3 === 0 ? 'fill-primary h-5 w-5' : 'fill-secondary text-secondary h-3.5 w-3.5'
              }
            />
          </motion.span>
        );
      })}
    </div>
  );
}
