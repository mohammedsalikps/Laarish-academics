import { cn } from '../lib/cn';

/**
 * Round progress shared by the round-based games: a dot per round plus a
 * visible "Round 2 of 5", so children (and grown-ups watching) always know how
 * far they are.
 */
export function RoundDots({ total, current, currentDone }: { total: number; current: number; currentDone: boolean }) {
  return (
    <div className="mt-2 flex shrink-0 flex-col items-end gap-1">
      <ol className="flex items-center gap-1.5" aria-label="Round progress">
        {Array.from({ length: total }, (_, i) => {
          const done = i < current || (i === current && currentDone);
          const now = i === current;
          return (
            <li key={i} className={cn('h-3 rounded-full', now ? 'w-6' : 'w-3', done ? 'bg-success' : now ? 'bg-primary' : 'bg-ink/15')}>
              <span className="sr-only">{done ? `Round ${i + 1} done` : now ? `Round ${i + 1}, playing now` : `Round ${i + 1}`}</span>
            </li>
          );
        })}
      </ol>
      <span className="whitespace-nowrap text-xs font-extrabold text-ink-muted" aria-hidden="true">
        Round {Math.min(current + 1, total)} of {total}
      </span>
    </div>
  );
}
