import { Check, ChevronRight, Lock } from 'lucide-react';
import { cn } from '../../lib/cn';

export type StepId = 'watch' | 'play' | 'practice' | 'complete';

export interface StepItem {
  id: StepId;
  label: string;
  state: 'done' | 'current' | 'available' | 'locked';
}

/** "1. Watch → 2. Play → 3. Practice → 4. Complete" with clear current/done/locked states. */
export function StepIndicator({ steps, onSelect }: { steps: StepItem[]; onSelect: (id: StepId) => void }) {
  return (
    <nav aria-label="Topic steps">
      <ol className="flex items-center gap-1 sm:gap-2">
        {steps.map((s, i) => {
          const clickable = s.state !== 'locked' && s.state !== 'current';
          return (
            // On phones only the current step shows its label, so it gets extra room.
            <li key={s.id} className={cn('flex min-w-0 items-center gap-1 sm:flex-1 sm:gap-2', s.state === 'current' ? 'flex-[2.2]' : 'flex-1')}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onSelect(s.id)}
                aria-current={s.state === 'current' ? 'step' : undefined}
                aria-label={`Step ${i + 1}: ${s.label}${s.state === 'done' ? ', done' : s.state === 'locked' ? ', locked' : s.state === 'current' ? ', current step' : ''}`}
                className={cn(
                  'flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl border-2 px-2 py-1.5 text-sm font-extrabold transition sm:justify-start sm:px-3',
                  s.state === 'current' && 'border-primary bg-primary text-white shadow-soft',
                  s.state === 'done' && 'border-success/30 bg-success-soft text-success-strong hover:border-success/60',
                  s.state === 'available' && 'border-line bg-surface text-ink hover:border-primary/40',
                  s.state === 'locked' && 'cursor-not-allowed border-dashed border-line bg-canvas text-ink-muted',
                )}
              >
                <span
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs',
                    s.state === 'current' ? 'bg-white/25' : s.state === 'done' ? 'bg-success text-white' : 'bg-canvas-sunken',
                  )}
                  aria-hidden="true"
                >
                  {s.state === 'done' ? <Check className="h-3.5 w-3.5" /> : s.state === 'locked' ? <Lock className="h-3 w-3" /> : i + 1}
                </span>
                <span className={cn('truncate', s.state !== 'current' && 'hidden sm:inline')}>{s.label}</span>
              </button>
              {i < steps.length - 1 && <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
