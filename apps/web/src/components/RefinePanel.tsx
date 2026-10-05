import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { MAX_INSTRUCTION, MIN_INSTRUCTION } from '../lib/editing';
import { cn } from '../lib/utils';

import { Button } from './ui/button';

const CHIPS = [
  "It's raining",
  'Running late',
  'Something cheaper',
  'More outdoors',
  'Add a food stop',
  'Shorter day',
] as const;

interface RefinePanelProps {
  /** A revision is being requested or planned; the form waits. */
  pending: boolean;
  onSubmit: (instruction: string) => void;
  className?: string;
}

/**
 * "Not going as planned?" Tell the guide what changed, in a few words or a tap on a suggestion,
 * and it revises the day. Collapsed by default so it stays out of the way until it is needed.
 */
export function RefinePanel({ pending, onSubmit, className }: RefinePanelProps) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelId = useId();
  const errorId = useId();

  const choose = (chip: string) => {
    setText(chip);
    setError(null);
    inputRef.current?.focus();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const instruction = text.trim();
    if (instruction.length < MIN_INSTRUCTION) {
      setError('Tell your guide what you would like changed.');
      inputRef.current?.focus();
      return;
    }
    onSubmit(instruction);
  };

  return (
    <section
      aria-label="Ask your guide to change the plan"
      className={cn(
        'border-input bg-card/70 shadow-soft rounded-xl border backdrop-blur',
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="focus-visible:ring-ring flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="text-primary h-4 w-4" aria-hidden="true" />
          Not going as planned? Ask your guide
        </span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            id={panelId}
            onSubmit={submit}
            noValidate
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4">
              <div role="group" aria-label="Suggestions" className="flex flex-wrap gap-1.5">
                {CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={pending}
                    onClick={() => choose(chip)}
                    className="border-input hover:bg-accent focus-visible:ring-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (error) setError(null);
                  }}
                  rows={2}
                  maxLength={MAX_INSTRUCTION}
                  disabled={pending}
                  aria-label="What would you like to change?"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  placeholder="e.g. We're tired, keep the rest close by"
                  className="border-input bg-background focus-visible:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:opacity-60"
                />
                <div className="flex items-start justify-between gap-2">
                  <p id={errorId} role="alert" className="text-destructive text-xs">
                    {error}
                  </p>
                  {text.length > MAX_INSTRUCTION - 60 && (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {text.length}/{MAX_INSTRUCTION}
                    </span>
                  )}
                </div>
              </div>

              <Button type="submit" size="sm" disabled={pending}>
                <Sparkles aria-hidden="true" /> {pending ? 'Asking your guide…' : 'Update my day'}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
