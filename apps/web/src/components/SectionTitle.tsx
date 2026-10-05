import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface SectionTitleProps {
  title: string;
  children?: ReactNode;
}

/** A page heading whose dashed route line draws in beneath it. */
export function SectionTitle({ title, children }: SectionTitleProps) {
  const reduce = useReducedMotion();
  return (
    <header className="space-y-2">
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      <motion.span
        aria-hidden="true"
        className="route-line block w-28 origin-left"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.15, duration: 0.7, ease: 'easeOut' }}
      />
      {children && <p className="text-muted-foreground">{children}</p>}
    </header>
  );
}
