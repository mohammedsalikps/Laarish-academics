import { BookOpen, Check, ChevronDown, Hand, Lightbulb, RotateCcw, Trophy } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ObjectPicture } from '../../components/art/ObjectArt';
import { Icon } from '../../components/ui/Icon';
import { useSound } from '../../hooks/usePreferences';
import type { SortGameConfig } from '../../domain/types';
import { cn } from '../../lib/cn';
import { beginPointerDrag, type MiniGameProps } from '../framework';
// The pointer geometry is shared with Concept Match (pure helpers, unit tested in match/dragMath.test.ts).
import { dropTargetAt, ghostTransform, grabOffset, passedDragThreshold, toBox, type Point } from '../match/dragMath';
import { createSortReducer, createSortState, currentItem, sortResult } from './sortLogic';

type Tone = 'active' | 'good' | 'retry';
const TONE_CLASS: Record<Tone, string> = {
  active: 'bg-primary-soft text-primary-strong',
  good: 'bg-success-soft text-success-strong',
  retry: 'bg-reward-soft text-reward-strong',
};
const STATUS_ICON = { active: Hand, good: Check, retry: Lightbulb } satisfies Record<Tone, unknown>;

/* Feedback motions (Web Animations, skipped entirely with reduced motion). */
const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px)' },
  { transform: 'translateX(6px)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(4px)' },
  { transform: 'translateX(0)' },
];
const POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }];
const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';

/** Shape of the item card (and of its drag ghost). */
const ITEM_CARD =
  'relative flex min-h-[64px] min-w-[10rem] max-w-full items-center justify-center gap-2.5 rounded-3xl border-2 px-6 py-4 text-center font-display text-xl font-semibold leading-tight sm:text-2xl';

function animate(el: Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null {
  return el && typeof el.animate === 'function' ? el.animate(keyframes, options) : null;
}

/** A press on the item card. It turns into a drag once the pointer moves past the threshold. */
interface Press {
  id: string;
  pointerId: number;
  start: Point;
  offset: Point;
  dragging: boolean;
  returning: boolean;
}

type Item = SortGameConfig['items'][number];

/**
 * Sort & classify: one item at a time. Drag it into the box where it belongs, or
 * tap the box (tapping the item first picks it up). Keyboard: Tab to the boxes and
 * press Enter; arrow keys move between the card and the boxes.
 */
export default function SortGame({ config, attempt, reducedMotion, onEvent, onComplete, onRestart }: MiniGameProps<SortGameConfig>) {
  const reducer = useMemo(() => createSortReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, undefined, () => createSortState(config, attempt + 11));
  const play = useSound();
  const uid = useId().replace(/:/g, '');
  const items = useMemo(() => new Map(config.items.map((i) => [i.id, i])), [config.items]);
  const bins = useMemo(() => new Map(config.bins.map((b) => [b.id, b])), [config.bins]);
  const callbacks = useRef({ onEvent, onComplete });
  useEffect(() => {
    callbacks.current = { onEvent, onComplete };
  }, [onEvent, onComplete]);

  useEffect(() => {
    callbacks.current.onEvent({ key: 'start' });
  }, []);

  const cardRef = useRef<HTMLButtonElement | null>(null);
  const binEls = useRef(new Map<string, HTMLButtonElement>());
  const stageRef = useRef<HTMLDivElement>(null);
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);
  /** How the game was last used, so focus only moves for keyboard players (never yanks a touch screen). */
  const inputMode = useRef<'pointer' | 'keyboard'>('pointer');
  const [showLearned, setShowLearned] = useState(false);

  /* -------------------------------------- sounds, motion, events, completion */
  const lastFeedback = useRef(state.feedback);
  const completed = useRef(false);
  useEffect(() => {
    const fb = state.feedback;
    if (!fb || fb === lastFeedback.current) return;
    lastFeedback.current = fb;
    const vars = { item: items.get(fb.itemId)!.label, bin: bins.get(fb.binId)!.label };
    if (fb.kind === 'correct' && !reducedMotion) animate(binEls.current.get(fb.binId), POP, { duration: 320, easing: EASE_OUT });

    if (state.phase === 'complete') {
      if (completed.current) return;
      completed.current = true;
      const result = sortResult(config, state);
      play('reward');
      callbacks.current.onEvent({ key: result.perfect ? 'complete:perfect' : 'complete', vars });
      callbacks.current.onComplete(result);
      stageRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
      if (inputMode.current === 'keyboard') doneHeadingRef.current?.focus({ preventScroll: true });
    } else if (fb.kind === 'correct') {
      play('correct');
      callbacks.current.onEvent({ key: 'sort-correct', vars });
    } else {
      play('incorrect');
      callbacks.current.onEvent({ key: 'sort-incorrect', vars });
      if (!reducedMotion) animate(cardRef.current, SHAKE, { duration: 420, easing: 'ease-in-out' });
    }
  }, [state, config, items, bins, play, reducedMotion]);

  const current = currentItem(state);
  const done = state.phase === 'complete';

  /* ------------------------------------------------------- drag and drop */
  // While dragging, a copy of the card follows the pointer in a fixed layer (so it can never
  // widen the page), and the card itself stays behind as a faint placeholder.
  const press = useRef<Press | null>(null);
  const pointer = useRef<Point>({ x: 0, y: 0 });
  const ghost = useRef<HTMLDivElement | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{ id: string; width: number } | null>(null);
  const [hoverBin, setHoverBin] = useState<string | null>(null);

  // Place the ghost under the pointer as soon as it mounts; later moves update it directly.
  const setGhost = useCallback((el: HTMLDivElement | null) => {
    ghost.current = el;
    if (el && press.current) el.style.transform = ghostTransform(pointer.current, press.current.offset);
  }, []);

  const binBoxes = () =>
    config.bins.flatMap((b) => {
      const el = binEls.current.get(b.id);
      return el ? [toBox(b.id, el.getBoundingClientRect())] : [];
    });

  const endDrag = () => {
    press.current = null;
    setDrag(null);
    setHoverBin(null);
  };

  // A missed or cancelled drop glides back to the card (or simply disappears with reduced motion).
  const flyBack = (pr: Press) => {
    pr.returning = true;
    setHoverBin(null);
    const el = ghost.current;
    const home = cardRef.current?.getBoundingClientRect();
    const anim = !reducedMotion && el && home ? animate(el, [{ transform: el.style.transform }, { transform: ghostTransform({ x: home.left, y: home.top }, { x: 0, y: 0 }) }], { duration: 220, easing: EASE_OUT, fill: 'forwards' }) : null;
    if (!anim) return endDrag();
    anim.onfinish = endDrag;
    anim.oncancel = endDrag;
  };

  const onCardPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    inputMode.current = 'pointer';
    suppressClick.current = false;
    if (press.current?.dragging || !current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    beginPointerDrag(e);
    const p = { x: e.clientX, y: e.clientY };
    press.current = { id: current, pointerId: e.pointerId, start: p, offset: grabOffset(p, e.currentTarget.getBoundingClientRect()), dragging: false, returning: false };
    pointer.current = p;
  };

  const onCardPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.pointerId !== e.pointerId || pr.returning) return;
    pointer.current = { x: e.clientX, y: e.clientY };
    if (!pr.dragging) {
      if (!passedDragThreshold(pr.start, pointer.current)) return;
      pr.dragging = true;
      setDrag({ id: pr.id, width: e.currentTarget.offsetWidth });
      play('tap');
    }
    if (ghost.current) ghost.current.style.transform = ghostTransform(pointer.current, pr.offset);
    setHoverBin(dropTargetAt(pointer.current, binBoxes()));
  };

  const onCardPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.pointerId !== e.pointerId || pr.returning) return;
    if (!pr.dragging) {
      // A tap: the click that follows picks the item up.
      press.current = null;
      return;
    }
    suppressClick.current = true;
    pointer.current = { x: e.clientX, y: e.clientY };
    const target = dropTargetAt(pointer.current, binBoxes());
    if (!target) return flyBack(pr);
    endDrag();
    dispatch({ type: 'drop', itemId: pr.id, binId: target });
  };

  const onCardPointerCancel = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.pointerId !== e.pointerId || pr.returning) return;
    if (pr.dragging) flyBack(pr);
    else press.current = null;
  };

  /* ----------------------------------------------------- tap and keyboard */
  const onCardClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (!current) return;
    play('tap');
    dispatch({ type: 'select-item', id: current });
  };

  const onBinClick = (binId: string) => {
    if (current) dispatch({ type: 'drop', itemId: current, binId });
  };

  const focusBin = (index: number) => {
    const bin = config.bins[Math.max(0, Math.min(config.bins.length - 1, index))];
    binEls.current.get(bin.id)?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    inputMode.current = 'keyboard';
    suppressClick.current = false;
    const index = Number(e.currentTarget.dataset.bin ?? -1);
    if (e.key === 'Escape' && state.selectedItem) dispatch({ type: 'select-item', id: state.selectedItem });
    else if (index < 0 && e.key === 'ArrowDown') focusBin(0);
    else if (index >= 0 && e.key === 'ArrowRight') focusBin(index + 1);
    else if (index >= 0 && e.key === 'ArrowLeft') focusBin(index - 1);
    else if (index >= 0 && e.key === 'ArrowUp' && cardRef.current) cardRef.current.focus();
    else return;
    e.preventDefault();
  };

  const registerBin = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) binEls.current.set(id, el);
    else binEls.current.delete(id);
  };

  /* ---------------------------------------------------------- view state */
  const fb = state.feedback;
  const result = done ? sortResult(config, state) : null;
  const item = current ? items.get(current)! : null;
  const selected = Boolean(current && state.selectedItem === current);
  const dragItem = drag ? items.get(drag.id) : undefined;
  const ready = selected || Boolean(drag);
  // A wordless cue for the very first move: the card glows until the learner starts.
  const guide = !done && !ready && !fb && state.mistakes === 0 && Object.keys(state.placed).length === 0;
  const scoreLine = result ? (result.perfect ? 'Every one right on the first try!' : `${result.correct} of ${result.total} right on the first try.`) : '';

  // One short status line. Extra details are added for screen readers only.
  let status: { tone: Tone; text: string; sr?: string } | null = null;
  if (result) status = { tone: 'good', text: '', sr: `Everything is sorted! ${scoreLine}` };
  else if (drag) status = { tone: 'active', text: hoverBin ? `Let go to put it in “${bins.get(hoverBin)!.label}”.` : 'Drop it in its box.' };
  else if (fb?.kind === 'correct') status = { tone: 'good', text: items.get(fb.itemId)!.explanation, sr: item ? `Next: ${item.label}.` : undefined };
  else if (fb?.kind === 'incorrect') status = { tone: 'retry', text: 'Not that box. Try again!', sr: `“${items.get(fb.itemId)!.label}” does not go in “${bins.get(fb.binId)!.label}”.` };
  else if (selected) status = { tone: 'active', text: 'Now tap its box.' };
  const StatusIcon = status && STATUS_ICON[status.tone];

  return (
    <div className="space-y-3">
      {/* ------------------------------------ progress, reset and status */}
      <div className="flex items-center justify-between gap-3">
        <GameProgress done={Object.keys(state.placed).length} total={config.items.length} label="sorted" />
        <button type="button" onClick={onRestart} className={cn('btn btn-sm min-h-[44px] shrink-0', done ? 'btn-secondary' : 'btn-ghost')}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> {done ? 'Play again' : 'Start over'}
        </button>
      </div>
      <p role="status" className="flex min-h-[2.25rem] items-center text-sm font-bold sm:text-[0.95rem]">
        {status?.text && StatusIcon && (
          <span className={cn('inline-flex items-start gap-1.5 rounded-2xl px-3 py-1.5', TONE_CLASS[status.tone])}>
            <StatusIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {status.text}
          </span>
        )}
        {status?.sr && <span className="sr-only"> {status.sr}</span>}
      </p>

      {/* ------------------------------------- the one item to sort (or the finish) */}
      <p id={`${uid}-howto`} className="sr-only">
        Put it in the box where it belongs: drag it there, or choose a box. Arrow keys move between the boxes.
      </p>
      <div ref={stageRef} className="flex min-h-[7rem] scroll-mb-32 scroll-mt-24 items-center justify-center">
        {item ? (
          <div key={item.id} className={cn('max-w-full', !reducedMotion && 'animate-pop-in')}>
            <button
              ref={cardRef}
              type="button"
              aria-pressed={selected}
              aria-describedby={`${uid}-howto`}
              onClick={onCardClick}
              onKeyDown={onKeyDown}
              onPointerDown={onCardPointerDown}
              onPointerMove={onCardPointerMove}
              onPointerUp={onCardPointerUp}
              onPointerCancel={onCardPointerCancel}
              onLostPointerCapture={onCardPointerCancel}
              className={cn(
                ITEM_CARD,
                'cursor-grab touch-none select-none transition-[border-color,background-color,box-shadow,opacity] duration-150 active:cursor-grabbing',
                drag
                  ? 'border-dashed border-primary/50 bg-primary-soft/40 opacity-50'
                  : selected
                    ? 'border-primary bg-primary-soft text-primary-strong shadow-lift ring-4 ring-primary/20'
                    : guide
                      ? cn('border-primary bg-surface shadow-soft', reducedMotion ? 'ring-4 ring-primary/25' : 'animate-pulse-ring')
                      : 'border-line bg-surface shadow-soft hover:border-primary/40',
              )}
            >
              <ItemFace item={item} />
            </button>
          </div>
        ) : (
          result && (
            <section aria-labelledby={`${uid}-done`} className={cn('card w-full p-4 sm:p-5', !reducedMotion && 'animate-pop-in')}>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                  {result.perfect ? <Trophy className="h-6 w-6" aria-hidden="true" /> : <Check className="h-6 w-6" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <h3 id={`${uid}-done`} ref={doneHeadingRef} tabIndex={-1} className="font-display text-xl font-semibold leading-tight focus:outline-none">
                    Everything is sorted!
                  </h3>
                  <p className="text-sm font-semibold text-ink-soft">{scoreLine}</p>
                </div>
              </div>
              <button
                type="button"
                aria-expanded={showLearned}
                aria-controls={`${uid}-learned`}
                onClick={() => setShowLearned((open) => !open)}
                className="btn btn-ghost btn-sm mt-2 min-h-[44px] px-2 text-primary-strong"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" /> See what you learned
                <ChevronDown className={cn('h-4 w-4', !reducedMotion && 'transition-transform', showLearned && 'rotate-180')} aria-hidden="true" />
              </button>
              <div id={`${uid}-learned`} hidden={!showLearned} className="mt-1 space-y-3">
                {config.bins.map((b) => (
                  <div key={b.id}>
                    <p className="eyebrow mb-1.5">{b.label}</p>
                    <ul className="space-y-1.5">
                      {config.items
                        .filter((i) => i.binId === b.id)
                        .map((i) => (
                          <li key={i.id} className="flex items-start gap-2 rounded-2xl bg-canvas px-3 py-2 text-sm">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                            <span>{i.explanation}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )
        )}
      </div>

      {/* --------------------------------------------------------- boxes */}
      <div role="group" aria-label="Boxes" className={cn('grid gap-2 sm:gap-3', config.bins.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {config.bins.map((b, index) => {
          const inBin = config.items.filter((i) => state.placed[i.id] === b.id);
          const hovered = hoverBin === b.id;
          const wrong = !ready && fb?.kind === 'incorrect' && fb.binId === b.id;
          return (
            <button
              key={b.id}
              ref={registerBin(b.id)}
              type="button"
              data-bin={index}
              onClick={() => onBinClick(b.id)}
              onKeyDown={onKeyDown}
              aria-disabled={done || undefined}
              aria-label={`${b.label}: ${b.description}. ${inBin.length} sorted here.`}
              className={cn(
                'flex min-h-[8rem] min-w-0 flex-col items-center rounded-3xl border-2 p-2.5 text-center transition-[border-color,background-color,box-shadow] duration-150 sm:p-4',
                done
                  ? 'cursor-default border-line bg-canvas'
                  : hovered
                    ? 'border-primary bg-primary-soft shadow-lift ring-4 ring-primary/20'
                    : wrong
                      ? 'border-coral bg-surface'
                      : ready
                        ? 'border-dashed border-primary/60 bg-primary-soft/40 hover:bg-primary-soft'
                        : 'border-dashed border-line-strong bg-surface hover:border-primary/50',
              )}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon name={b.icon} width={22} height={22} />
              </span>
              <span className="mt-1.5 max-w-full break-words font-display text-base font-semibold leading-tight sm:text-lg">{b.label}</span>
              <span className={cn('mt-0.5 max-w-full text-xs font-bold text-ink-muted', config.bins.length > 2 && 'hidden sm:block')}>{b.description}</span>
              {inBin.length > 0 && (
                <span className="mt-2 flex max-w-full flex-wrap justify-center gap-1">
                  {inBin.map((i) => (
                    <span key={i.id} className={cn('max-w-full break-words rounded-lg bg-success-soft px-2 py-0.5 text-xs font-bold text-success-strong', !reducedMotion && 'animate-pop-in')}>
                      {i.label}
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* The card being dragged follows the pointer above everything else. */}
      {drag &&
        dragItem &&
        createPortal(
          <div ref={setGhost} className="pointer-events-none fixed left-0 top-0 z-[70]" style={{ width: drag.width }} aria-hidden="true">
            <div className={cn(ITEM_CARD, 'w-full border-primary bg-surface text-ink shadow-float', hoverBin && 'ring-4 ring-primary/25', !reducedMotion && '-rotate-2 scale-[1.03]')}>
              <ItemFace item={dragItem} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Picture (or icon) and words of the item card. */
function ItemFace({ item }: { item: Item }) {
  return (
    <>
      {item.art ? (
        <ObjectPicture art={item.art} size={52} className="-my-2" />
      ) : (
        item.icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Icon name={item.icon} width={20} height={20} />
          </span>
        )
      )}
      <span className="min-w-0 break-words">{item.label}</span>
    </>
  );
}

/** Compact progress: one dot per item and "3 / 8". */
function GameProgress({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <p className="flex min-w-0 items-center gap-2.5 text-sm font-extrabold tabular-nums text-ink-soft">
      {total <= 12 && (
        <span className="flex gap-1" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={cn('h-2.5 w-2.5 rounded-full transition-colors duration-300', i < done ? 'bg-success' : 'bg-ink/15')} />
          ))}
        </span>
      )}
      <span>
        {done} / {total}
        <span className="sr-only"> {label}</span>
      </span>
    </p>
  );
}
