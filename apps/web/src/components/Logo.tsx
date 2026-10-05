import { Link } from 'react-router-dom';

export function Logo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 rounded-md" aria-label="Daydrift home">
      <svg viewBox="0 0 32 32" className="text-primary h-7 w-7" aria-hidden="true" fill="none">
        <path
          d="M4 24 C 10 24, 10 10, 17 12 S 24 22, 28 8"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="1 5"
        />
        <circle cx="4" cy="24" r="3" fill="currentColor" />
        <circle cx="28" cy="8" r="3" fill="currentColor" />
      </svg>
      <span className="font-display text-xl font-semibold tracking-tight">Daydrift</span>
    </Link>
  );
}
