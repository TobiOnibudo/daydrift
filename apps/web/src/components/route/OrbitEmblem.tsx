/**
 * The Daydrift mark inside a slowly turning dashed orbit with a small moon circling it. Decorative.
 * The rotation is CSS, so the global reduced-motion rule freezes it.
 */
export function OrbitEmblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" className={className} fill="none">
      <g className="animate-orbit origin-center">
        <circle
          cx="48"
          cy="48"
          r="42"
          stroke="hsl(var(--primary))"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeDasharray="2 7"
        />
        <circle
          cx="48"
          cy="6"
          r="4.5"
          fill="hsl(var(--secondary))"
          stroke="hsl(var(--card))"
          strokeWidth="2"
        />
      </g>
      <g className="animate-orbit-reverse origin-center">
        <circle
          cx="48"
          cy="48"
          r="30"
          stroke="hsl(var(--secondary))"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeDasharray="1 6"
        />
      </g>
      <path
        d="M30 62 C 40 62, 40 38, 50 42 S 60 58, 68 34"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 6"
      />
      <circle cx="30" cy="62" r="4.5" fill="hsl(var(--primary))" />
      <circle cx="68" cy="34" r="4.5" fill="hsl(var(--primary))" />
    </svg>
  );
}
