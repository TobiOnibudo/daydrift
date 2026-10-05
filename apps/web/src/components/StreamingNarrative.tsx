import { motion } from 'framer-motion';

interface StreamingNarrativeProps {
  text: string;
  /** Show a blinking caret while the guide is still writing. */
  streaming?: boolean;
}

/**
 * The guide's prose, revealed word by word as tokens arrive. The region is `aria-live="polite"` so
 * screen readers announce new text without flooding (docs/05 §7).
 */
export function StreamingNarrative({ text, streaming = false }: StreamingNarrativeProps) {
  const words = text.split(/(\s+)/).filter(Boolean);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      aria-label="Your guide is writing"
      className="font-display text-foreground/90 min-h-[7rem] text-lg leading-relaxed"
    >
      {words.length === 0 ? (
        <p className="text-muted-foreground text-base">Your guide is gathering ideas…</p>
      ) : (
        <p>
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {word}
            </motion.span>
          ))}
          {streaming && (
            <span
              aria-hidden="true"
              className="animate-caret bg-primary ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.2em]"
            />
          )}
        </p>
      )}
    </div>
  );
}
