import { cn } from '../../lib/cn';
import { dayKey } from '../../pages/home/schoolWeek';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * StreakBar dots for this week, Monday to Sunday (wireframe S3 and P1):
 * orange = played, a ring = today, grey = not yet. A missed day stays grey,
 * never red.
 */
export function StreakWeek({ activeDays, today = new Date(), size = 'sm' }: { activeDays: readonly string[]; today?: Date; size?: 'sm' | 'md' }) {
  const active = new Set(activeDays);
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const todayKey = dayKey(today);
  return (
    <ol className="flex gap-1" aria-label="This week">
      {DAY_LETTERS.map((letter, i) => {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const key = dayKey(d);
        const isToday = key === todayKey;
        const played = active.has(key);
        return (
          <li
            key={key}
            aria-label={`${d.toLocaleDateString(undefined, { weekday: 'long' })}${played ? ', played' : isToday ? ', today' : ''}`}
            className={cn(
              'grid place-items-center rounded-full font-extrabold',
              size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs',
              played ? 'bg-[#E8833A] text-white' : isToday ? 'text-ink ring-2 ring-[#E8833A]' : 'bg-canvas-sunken text-ink-muted',
            )}
          >
            {letter}
          </li>
        );
      })}
    </ol>
  );
}
