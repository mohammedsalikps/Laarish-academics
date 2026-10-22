import { Check, X } from 'lucide-react';
import type { QuizAnswer, QuizQuestion } from '../../domain/types';
import { cn } from '../../lib/cn';
import { LETTERS } from '../../quiz/answerText';

/**
 * The answer choices of one question: big tappable cards (single choice), True
 * and False, or matching. `resolved` shows the right answer (green) and the
 * learner's last answer.
 */
export function AnswerChoices({
  question,
  draft,
  last,
  resolved,
  retry,
  onChange,
}: {
  question: QuizQuestion;
  draft: QuizAnswer | null;
  last?: QuizAnswer;
  resolved: boolean;
  /** The last answer was wrong and the learner can try again. */
  retry: boolean;
  onChange: (answer: QuizAnswer) => void;
}) {
  const choiceState = (selected: boolean, isCorrectOption: boolean, wasChosen: boolean) => {
    if (resolved) {
      if (isCorrectOption) return 'border-success bg-success-soft text-success-strong';
      if (wasChosen) return 'border-coral/60 bg-coral-soft text-coral-strong';
      return 'border-line bg-surface opacity-60';
    }
    if (selected) return 'border-primary bg-primary-soft shadow-soft ring-4 ring-primary/15';
    return 'border-line bg-surface hover:border-primary/40';
  };

  if (question.type === 'single-choice') {
    return (
      <div role="radiogroup" aria-label="Answer choices" className="grid gap-2.5 sm:grid-cols-2">
        {question.options.map((o, i) => {
          const selected = draft?.type === 'single-choice' && draft.optionId === o.id;
          const wasChosen = last?.type === 'single-choice' && last.optionId === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={resolved}
              onClick={() => onChange({ type: 'single-choice', optionId: o.id })}
              className={cn(
                'flex min-h-[60px] items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left text-[1.05rem] font-bold transition',
                choiceState(selected, o.id === question.correctOptionId, wasChosen),
                retry && wasChosen && !selected && 'border-dashed border-coral/50',
              )}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-canvas-sunken font-display text-base font-semibold text-ink-soft">{LETTERS[i]}</span>
              <span className="min-w-0 break-words">{o.text}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'true-false') {
    return (
      <div role="radiogroup" aria-label="True or false" className="grid grid-cols-2 gap-3">
        {[true, false].map((v) => {
          const selected = draft?.type === 'true-false' && draft.value === v;
          const wasChosen = last?.type === 'true-false' && last.value === v;
          return (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={resolved}
              onClick={() => onChange({ type: 'true-false', value: v })}
              className={cn('flex min-h-[72px] items-center justify-center gap-2 rounded-2xl border-2 font-display text-xl font-semibold transition', choiceState(selected, v === question.correct, wasChosen))}
            >
              {v ? <Check className="h-6 w-6" aria-hidden="true" /> : <X className="h-6 w-6" aria-hidden="true" />}
              {v ? 'True' : 'False'}
            </button>
          );
        })}
      </div>
    );
  }

  const mapping = draft?.type === 'match-pairs' ? draft.mapping : {};
  // Right-hand options in a stable but mixed order.
  const rights = [...question.pairs].sort((a, b) => a.right.localeCompare(b.right));
  return (
    <div className="space-y-3">
      {question.pairs.map((p) => (
        <div key={p.id} className="rounded-2xl border border-line bg-surface p-3">
          <p className="mb-2 font-extrabold">{p.left}</p>
          <div role="radiogroup" aria-label={`Match for ${p.left}`} className="flex flex-wrap gap-2">
            {rights.map((r) => {
              const selected = mapping[p.id] === r.id;
              const correct = resolved && r.id === p.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={resolved}
                  onClick={() => {
                    const next = { ...mapping };
                    // Each right-hand option can only be used once.
                    for (const k of Object.keys(next)) if (next[k] === r.id) delete next[k];
                    next[p.id] = r.id;
                    onChange({ type: 'match-pairs', mapping: next });
                  }}
                  className={cn(
                    'min-h-[44px] rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition',
                    correct ? 'border-success bg-success-soft text-success-strong' : selected ? 'border-primary bg-primary-soft' : 'border-line bg-canvas hover:border-primary/40',
                  )}
                >
                  {r.right}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
