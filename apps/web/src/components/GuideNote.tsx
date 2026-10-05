import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';

import { cn } from '../lib/utils';

const COLLAPSE_AFTER = 260;

interface GuideNoteProps {
  /** What the guide wrote about the day. Nothing is rendered for trips that have none. */
  text?: string | null;
  className?: string;
}

/**
 * The guide's own words about the day, kept with the trip. Long notes fold to a few lines so the
 * itinerary stays in view, with a toggle that is announced to screen readers.
 */
export function GuideNote({ text, className }: GuideNoteProps) {
  const [open, setOpen] = useState(false);
  const note = text?.trim();
  if (!note) return null;

  const long = note.length > COLLAPSE_AFTER;
  const paragraphs = note.split(/\n{2,}/);

  return (
    <motion.section
      aria-label="From your guide"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('bg-card/80 shadow-soft rounded-xl border p-4 backdrop-blur', className)}
    >
      <p className="text-secondary mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
        <span className="bg-secondary text-secondary-foreground grid h-6 w-6 place-items-center rounded-full">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        Your guide says
      </p>
      <div
        id="guide-note-text"
        className={cn(
          'font-display text-foreground/90 space-y-2 text-[1.05rem] leading-relaxed',
          long && !open && 'line-clamp-4',
        )}
      >
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls="guide-note-text"
          onClick={() => setOpen((v) => !v)}
          className="text-primary mt-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </motion.section>
  );
}
