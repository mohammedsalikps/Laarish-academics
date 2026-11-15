import { Check, Hand, X } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import type { PictureChoiceQuestion, QuizAnswer, SortQuestion, TrueFalseReasonQuestion } from '../../domain/types';
import { cn } from '../../lib/cn';
import { ObjectPicture } from '../art/ObjectArt';

/**
 * Practice answer types from the wireframe: picture choice (L3a), sort into
 * two trays (L3b, drag or tap-to-place) and true/false with a reason (L3c).
 * Wrong answers never use red: a soft orange outline, and the right answer in green.
 */

type Tone = 'idle' | 'selected' | 'right' | 'chosen-wrong' | 'dim';

const TONE: Record<Tone, string> = {
  idle: 'border-line bg-surface hover:border-primary/50',
  selected: 'border-primary bg-primary-soft ring-4 ring-primary/15',
  right: 'border-success bg-success-soft text-success-strong',
  'chosen-wrong': 'border-[#E8833A] bg-[#FFF1E6] text-[#8A3D06]',
  dim: 'border-line bg-surface opacity-60',
};

export function PictureChoice({
  question,
  draft,
  last,
  resolved,
  onChange,
}: {
  question: PictureChoiceQuestion;
  draft: QuizAnswer | null;
  last?: QuizAnswer;
  resolved: boolean;
  onChange: (answer: QuizAnswer) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Picture choices" className="grid grid-cols-2 gap-3">
      {question.options.map((o) => {
        const selected = draft?.type === 'picture-choice' && draft.optionId === o.id;
        const wasChosen = last?.type === 'picture-choice' && last.optionId === o.id;
        const tone: Tone = resolved ? (o.id === question.correctOptionId ? 'right' : wasChosen ? 'chosen-wrong' : 'dim') : selected ? 'selected' : 'idle';
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={resolved}
            onClick={() => onChange({ type: 'picture-choice', optionId: o.id })}
            className={cn('relative flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-3xl border-2 p-3 text-center font-extrabold transition', TONE[tone])}
          >
            {selected && !resolved && (
              <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-white" aria-hidden="true">
                <Check className="h-4 w-4" />
              </span>
            )}
            {o.art ? <ObjectPicture art={o.art} size={64} /> : <span className="h-16" aria-hidden="true" />}
            <span className="text-[1.05rem] leading-tight">{o.text}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SortTrays({
  question,
  draft,
  resolved,
  onChange,
}: {
  question: SortQuestion;
  draft: QuizAnswer | null;
  resolved: boolean;
  onChange: (answer: QuizAnswer) => void;
}) {
  const placement = draft?.type === 'sort' ? draft.placement : {};
  const [picked, setPicked] = useState<string | null>(null);
  const place = (itemId: string, binId: string | null) => {
    const next = { ...placement };
    if (binId) next[itemId] = binId;
    else delete next[itemId];
    setPicked(null);
    onChange({ type: 'sort', placement: next });
  };
  const loose = question.items.filter((i) => !placement[i.id]);
  const pickedItem = question.items.find((i) => i.id === picked);

  const chip = (item: SortQuestion['items'][number], inBin: string | null) => {
    const isPicked = picked === item.id;
    const tone: Tone = resolved ? (inBin === item.binId ? 'right' : 'chosen-wrong') : isPicked ? 'selected' : 'idle';
    return (
      <button
        key={item.id}
        type="button"
        draggable={!resolved}
        disabled={resolved}
        onDragStart={(e: DragEvent) => e.dataTransfer.setData('text/plain', item.id)}
        onClick={() => setPicked(isPicked ? null : item.id)}
        aria-pressed={isPicked}
        aria-label={`${item.text}${inBin ? `, in ${question.bins.find((b) => b.id === inBin)?.text}` : ', not sorted yet'}${isPicked ? ', picked up' : ''}`}
        className={cn('flex min-h-[48px] w-full items-center gap-2 rounded-2xl border-2 px-2.5 py-1.5 text-left text-sm font-extrabold transition', TONE[tone])}
      >
        {item.art && <ObjectPicture art={item.art} size={30} />}
        <span className="min-w-0 flex-1">{item.text}</span>
      </button>
    );
  };

  const drop = (binId: string | null) => (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id && question.items.some((i) => i.id === id)) place(id, binId);
  };

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-primary-strong">
        <Hand className="h-4 w-4" aria-hidden="true" /> Tap an object, then tap a tray · or drag it
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {question.bins.map((bin) => {
          const inside = question.items.filter((i) => placement[i.id] === bin.id);
          return (
            <div
              key={bin.id}
              onDragOver={(e) => !resolved && e.preventDefault()}
              onDrop={drop(bin.id)}
              className={cn('flex min-h-[150px] flex-col rounded-3xl border-2 border-dashed p-2', pickedItem ? 'border-primary bg-primary-soft/60' : 'border-line-strong bg-canvas')}
            >
              <button
                type="button"
                disabled={resolved || !pickedItem}
                onClick={() => pickedItem && place(pickedItem.id, bin.id)}
                className="mb-2 min-h-[44px] rounded-2xl px-2 text-center text-xs font-extrabold uppercase tracking-wider text-ink-soft enabled:bg-white enabled:shadow-soft"
                aria-label={pickedItem ? `Put ${pickedItem.text} in ${bin.text}` : `${bin.text} tray`}
              >
                {bin.text}
              </button>
              <div className="space-y-1.5">{inside.map((i) => chip(i, bin.id))}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-3xl bg-canvas-sunken/70 p-2" onDragOver={(e) => !resolved && e.preventDefault()} onDrop={drop(null)}>
        <p className="mb-1.5 px-1 text-xs font-extrabold uppercase tracking-wider text-ink-muted">Still to sort</p>
        {loose.length === 0 ? (
          <p className="px-1 pb-1 text-sm font-bold text-success-strong">All sorted. Press Check!</p>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">{loose.map((i) => chip(i, null))}</div>
        )}
        {pickedItem && <p className="mt-1.5 px-1 text-sm font-bold text-primary-strong" role="status">{`${pickedItem.text} is picked up · now tap a tray`}</p>}
      </div>
    </div>
  );
}

export function TrueFalseReason({
  question,
  draft,
  last,
  resolved,
  onChange,
}: {
  question: TrueFalseReasonQuestion;
  draft: QuizAnswer | null;
  last?: QuizAnswer;
  resolved: boolean;
  onChange: (answer: QuizAnswer) => void;
}) {
  const current = draft?.type === 'true-false-reason' ? draft : { type: 'true-false-reason' as const };
  const lastAnswer = last?.type === 'true-false-reason' ? last : undefined;
  return (
    <div>
      <div role="radiogroup" aria-label="True or false" className="grid grid-cols-2 gap-3">
        {[true, false].map((v) => {
          const selected = current.value === v;
          const tone: Tone = resolved ? (v === question.correct ? 'right' : lastAnswer?.value === v ? 'chosen-wrong' : 'dim') : selected ? 'selected' : 'idle';
          return (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={resolved}
              onClick={() => onChange({ ...current, value: v })}
              className={cn('flex min-h-[64px] items-center justify-center gap-2 rounded-2xl border-2 font-display text-xl font-extrabold transition', TONE[tone])}
            >
              {v ? <Check className="h-6 w-6" aria-hidden="true" /> : <X className="h-6 w-6" aria-hidden="true" />}
              {v ? 'True' : 'False'}
            </button>
          );
        })}
      </div>
      <p className="mb-2 mt-4 text-xs font-extrabold uppercase tracking-[0.14em] text-ink-muted">Why? Pick a reason</p>
      <div role="radiogroup" aria-label="Pick a reason" className="space-y-2">
        {question.reasons.map((r) => {
          const selected = current.reasonId === r.id;
          const tone: Tone = resolved ? (r.id === question.correctReasonId ? 'right' : lastAnswer?.reasonId === r.id ? 'chosen-wrong' : 'dim') : selected ? 'selected' : 'idle';
          return (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={resolved}
              onClick={() => onChange({ ...current, reasonId: r.id })}
              className={cn('flex min-h-[52px] w-full items-center rounded-2xl border-2 px-4 text-left text-[1.02rem] font-bold transition', TONE[tone])}
            >
              {r.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
