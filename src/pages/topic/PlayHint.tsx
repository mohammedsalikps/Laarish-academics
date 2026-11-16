import { Lightbulb, MessageCircle, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';

/**
 * "Need a hint?" in Play: one hint at a time, from a gentle nudge to the round's own hint.
 * After the last one the mentor can help. Hints never cost points and never change the game.
 */
export function PlayHint({
  steps,
  shown,
  open,
  mentorName,
  animate,
  onOpen,
  onShowMore,
  onClose,
  onAskMentor,
}: {
  steps: string[];
  /** How many hints have been revealed for this question (0 = none yet). */
  shown: number;
  open: boolean;
  mentorName: string;
  animate: boolean;
  /** Opens the hint panel (with the first hint, or the last one seen for this question). */
  onOpen(): void;
  onShowMore(): void;
  onClose(): void;
  onAskMentor(): void;
}) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const userAction = useRef(false);
  // After the learner opens, advances or closes a hint, focus moves to the next control. A new question
  // closing the hint on its own leaves focus where the game put it.
  useEffect(() => {
    if (!userAction.current) return;
    userAction.current = false;
    (open ? actionRef : triggerRef).current?.focus({ preventScroll: true });
  }, [open, shown]);
  const act = (fn: () => void) => () => {
    userAction.current = true;
    fn();
  };

  if (steps.length === 0) return null;
  const total = steps.length;
  const current = Math.min(Math.max(shown, 1), total);
  const more = current < total;

  return (
    <div className="mb-2">
      <div aria-live="polite">
        {open && (
          <div className={cn('rounded-2xl border border-reward/40 bg-reward-soft p-3', animate && 'animate-fade-up')} data-testid="play-hint">
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-reward-strong" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-[0.95rem] font-semibold leading-snug text-ink">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-reward-strong">
                  Hint {current} of {total}
                </span>
                {steps[current - 1]}
              </p>
              <button type="button" onClick={act(onClose)} aria-label="Close the hint" className="-m-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-surface/60">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
              {more ? (
                <button ref={actionRef} type="button" onClick={act(onShowMore)} className="btn btn-secondary btn-sm min-h-[44px]">
                  <Lightbulb className="h-4 w-4 text-reward-strong" aria-hidden="true" /> Another hint
                </button>
              ) : (
                <button ref={actionRef} type="button" onClick={onAskMentor} className="btn btn-secondary btn-sm min-h-[44px]">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> Ask {mentorName}
                </button>
              )}
              <span className="text-xs font-bold text-ink-muted">Hints are free. They never take away stars.</span>
            </div>
          </div>
        )}
      </div>
      {!open && (
        <button ref={triggerRef} type="button" onClick={act(onOpen)} className="btn btn-ghost btn-sm min-h-[44px] !px-2.5">
          <Lightbulb className="h-5 w-5 text-reward-strong" aria-hidden="true" /> {shown > 0 ? 'Show my hint' : 'Need a hint?'}
        </button>
      )}
    </div>
  );
}
