import { ArrowRight, BookOpen, Check, ChevronDown, Hand, Lightbulb, RotateCcw, Trophy } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../components/ui/Icon';
import { useSound } from '../../hooks/usePreferences';
import type { ConceptMatchConfig } from '../../domain/types';
import { cn } from '../../lib/cn';
import { beginPointerDrag, type MiniGameProps } from '../framework';
import { connectorPath, dropTargetAt, ghostTransform, grabOffset, passedDragThreshold, toBox, type Point } from './dragMath';
import { createMatchReducer, createMatchState, hintLevel, matchResult, nearestUnmatched, stepUnmatched } from './matchLogic';

const PAIR_COLORS = ['#5847E0', '#0E9F8E', '#E5603F', '#D9820A', '#2F86D6', '#D23F6E'];
const pairColor = (index: number) => PAIR_COLORS[index % PAIR_COLORS.length];

type Side = 'L' | 'R';
type Pair = ConceptMatchConfig['pairs'][number];

type Tone = 'active' | 'good' | 'retry';
const TONE_CLASS: Record<Tone, string> = {
  active: 'bg-primary-soft text-primary-strong',
  good: 'bg-success-soft text-success-strong',
  retry: 'bg-reward-soft text-reward-strong',
};
const STATUS_ICON = { active: Hand, good: Check, retry: Lightbulb } satisfies Record<Tone, unknown>;

/** A press on an example card. It turns into a drag once the pointer moves past the threshold. */
interface Press {
  id: string;
  pointerId: number;
  start: Point;
  offset: Point;
  dragging: boolean;
  returning: boolean;
}

/* Feedback motions (Web Animations, skipped entirely with reduced motion). */
const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-6px)' },
  { transform: 'translateX(6px)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(4px)' },
  { transform: 'translateX(0)' },
];
const POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }];
const DRAW: Keyframe[] = [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }];
const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';

function animate(el: Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null {
  return el && typeof el.animate === 'function' ? el.animate(keyframes, options) : null;
}

const quote = (s: string) => `“${s}”`;

/**
 * Concept Match: drag an example onto its match, or tap one card and then the other.
 * The screen stays calm: the cards, a small "2 / 5" progress line, a reset action and
 * one short status line. The task itself is explained by the mentor and "How to play";
 * clues appear only after a wrong try, and the end is one line plus an optional recap.
 */
export default function ConceptMatch({ config, attempt, reducedMotion, onEvent, onComplete, onRestart }: MiniGameProps<ConceptMatchConfig>) {
  const reducer = useMemo(() => createMatchReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, undefined, () => createMatchState(config, attempt + 1));
  const play = useSound();
  const uid = useId().replace(/:/g, '');
  const pairs = useMemo(() => new Map(config.pairs.map((p) => [p.id, p])), [config.pairs]);
  const total = config.pairs.length;
  const callbacks = useRef({ onEvent, onComplete });
  useEffect(() => {
    callbacks.current = { onEvent, onComplete };
  }, [onEvent, onComplete]);

  useEffect(() => {
    callbacks.current.onEvent({ key: 'start' });
  }, []);

  const boardRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null);
  /** Card buttons keyed "L:id" / "R:id", and connector groups keyed by pair id. */
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const lines = useRef(new Map<string, SVGGElement>());
  /** How the last card was used, so focus only moves for keyboard players (never yanks a touch screen). */
  const inputMode = useRef<'pointer' | 'keyboard'>('pointer');

  /* ------------------------------------------------------- connector lines */
  // Lines are drawn in an overlay from the laid-out cards, so they follow any reflow. The board is
  // the cards' offsetParent, so offsets are board coordinates and ignore the pop/shake transforms.
  const drawLines = useCallback(() => {
    const layoutBox = (id: string, el: HTMLElement) =>
      toBox(id, { left: el.offsetLeft, top: el.offsetTop, right: el.offsetLeft + el.offsetWidth, bottom: el.offsetTop + el.offsetHeight });
    for (const [id, g] of lines.current) {
      const l = cards.current.get(`L:${id}`);
      const r = cards.current.get(`R:${id}`);
      if (!l || !r) continue;
      const { d, start, end } = connectorPath(layoutBox(id, l), layoutBox(id, r), { x: 0, y: 0 });
      const [path, dotA, dotB] = Array.from(g.children);
      path?.setAttribute('d', d);
      dotA?.setAttribute('cx', String(start.x));
      dotA?.setAttribute('cy', String(start.y));
      dotB?.setAttribute('cx', String(end.x));
      dotB?.setAttribute('cy', String(end.y));
    }
  }, []);
  useLayoutEffect(() => drawLines());
  useEffect(() => {
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => drawLines());
    ro.observe(board);
    board.querySelectorAll('ul').forEach((ul) => ro.observe(ul));
    return () => ro.disconnect();
  }, [drawLines]);

  /* -------------------------------------- sounds, motion, events, completion */
  const lastFeedback = useRef(state.feedback);
  const completed = useRef(false);
  useEffect(() => {
    const fb = state.feedback;
    if (!fb || fb === lastFeedback.current) return;
    lastFeedback.current = fb;
    const example = pairs.get(fb.leftId)!;
    const vars = { left: example.left, right: pairs.get(fb.rightId)!.right };
    const leftEl = cards.current.get(`L:${fb.leftId}`);
    const rightEl = cards.current.get(`R:${fb.rightId}`);
    const keyboard = inputMode.current === 'keyboard';

    if (fb.kind === 'correct' && !reducedMotion) {
      animate(leftEl, POP, { duration: 360, easing: EASE_OUT });
      animate(rightEl, POP, { duration: 360, easing: EASE_OUT, delay: 60 });
      animate(lines.current.get(fb.leftId)?.firstElementChild, DRAW, { duration: 420, easing: 'ease-out' });
    }

    if (state.phase === 'complete') {
      if (completed.current) return;
      completed.current = true;
      const result = matchResult(config, state);
      play('reward');
      callbacks.current.onEvent({ key: result.perfect ? 'complete:perfect' : 'complete', vars });
      callbacks.current.onComplete(result);
      summaryRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
      if (keyboard) summaryHeadingRef.current?.focus({ preventScroll: true });
    } else if (fb.kind === 'correct') {
      play('correct');
      callbacks.current.onEvent({ key: 'match-correct', vars });
      // Keyboard flow: the matched card leaves the tab order, so continue from the nearest open example.
      if (keyboard) {
        const next = nearestUnmatched(state.leftOrder, state.matched, state.leftOrder.indexOf(fb.leftId));
        if (next) cards.current.get(`L:${next}`)?.focus();
      }
    } else {
      play('incorrect');
      callbacks.current.onEvent({ key: 'match-incorrect', vars: { ...vars, hint: example.hint } });
      if (!reducedMotion) {
        animate(leftEl, SHAKE, { duration: 420, easing: 'ease-in-out' });
        animate(rightEl, SHAKE, { duration: 420, easing: 'ease-in-out' });
      }
      // Keyboard flow: back to the example, whose clue is now showing, ready to try again.
      if (keyboard) leftEl?.focus();
    }
  }, [state, config, pairs, play, reducedMotion]);

  /* ------------------------------------------------------- drag and drop */
  const press = useRef<Press | null>(null);
  const pointer = useRef<Point>({ x: 0, y: 0 });
  const ghost = useRef<HTMLDivElement | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{ id: string; width: number } | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [showLearned, setShowLearned] = useState(false);

  // Place the ghost under the pointer as soon as it mounts; later moves update it directly.
  const setGhost = useCallback((el: HTMLDivElement | null) => {
    ghost.current = el;
    if (el && press.current) el.style.transform = ghostTransform(pointer.current, press.current.offset);
  }, []);

  const dropBoxes = () =>
    state.rightOrder.flatMap((id) => {
      const el = cards.current.get(`R:${id}`);
      return el && !state.matched.includes(id) ? [toBox(id, el.getBoundingClientRect())] : [];
    });

  const endDrag = () => {
    press.current = null;
    setDrag(null);
    setHoverId(null);
  };

  // A missed or cancelled drop glides back to its card (or simply disappears with reduced motion).
  const flyBack = (pr: Press) => {
    pr.returning = true;
    setHoverId(null);
    const el = ghost.current;
    const home = cards.current.get(`L:${pr.id}`)?.getBoundingClientRect();
    const anim = !reducedMotion && el && home ? animate(el, [{ transform: el.style.transform }, { transform: ghostTransform({ x: home.left, y: home.top }, { x: 0, y: 0 }) }], { duration: 220, easing: EASE_OUT, fill: 'forwards' }) : null;
    if (!anim) return endDrag();
    anim.onfinish = endDrag;
    anim.oncancel = endDrag;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    inputMode.current = 'pointer';
    suppressClick.current = false;
    const id = e.currentTarget.dataset.id!;
    if (press.current?.dragging || state.phase !== 'playing' || state.matched.includes(id) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const p = { x: e.clientX, y: e.clientY };
    press.current = { id, pointerId: e.pointerId, start: p, offset: grabOffset(p, e.currentTarget.getBoundingClientRect()), dragging: false, returning: false };
    pointer.current = p;
    beginPointerDrag(e);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.pointerId !== e.pointerId || pr.returning) return;
    pointer.current = { x: e.clientX, y: e.clientY };
    if (!pr.dragging) {
      if (!passedDragThreshold(pr.start, pointer.current)) return;
      pr.dragging = true;
      dispatch({ type: 'clear-selection' });
      setDrag({ id: pr.id, width: e.currentTarget.offsetWidth });
      play('tap');
    }
    if (ghost.current) ghost.current.style.transform = ghostTransform(pointer.current, pr.offset);
    setHoverId(dropTargetAt(pointer.current, dropBoxes()));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.pointerId !== e.pointerId || pr.returning) return;
    if (!pr.dragging) {
      // A tap: the click that follows selects the card.
      press.current = null;
      return;
    }
    suppressClick.current = true;
    pointer.current = { x: e.clientX, y: e.clientY };
    const target = dropTargetAt(pointer.current, dropBoxes());
    if (target) dispatch({ type: 'try-pair', leftId: pr.id, rightId: target });
    if (target === pr.id) endDrag();
    else flyBack(pr);
  };

  const onPointerCancel = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.pointerId !== e.pointerId || pr.returning) return;
    if (pr.dragging) flyBack(pr);
    else press.current = null;
  };

  /* ----------------------------------------------------- tap and keyboard */
  const onCardClick = (side: Side, id: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (state.phase !== 'playing' || state.matched.includes(id)) return;
    // The tap that completes a pair gets the result sound instead.
    if (!(side === 'L' ? state.selectedRight : state.selectedLeft)) play('tap');
    dispatch({ type: side === 'L' ? 'select-left' : 'select-right', id });
  };

  const onCardKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    inputMode.current = 'keyboard';
    suppressClick.current = false;
    const side = e.currentTarget.dataset.side as Side;
    const row = Number(e.currentTarget.dataset.row);
    const [own, other] = side === 'L' ? [state.leftOrder, state.rightOrder] : [state.rightOrder, state.leftOrder];
    let next: [Side, string | null] | null = null;
    if (e.key === 'ArrowDown') next = [side, stepUnmatched(own, state.matched, row, 1)];
    else if (e.key === 'ArrowUp') next = [side, stepUnmatched(own, state.matched, row, -1)];
    else if (e.key === 'ArrowRight' && side === 'L') next = ['R', nearestUnmatched(other, state.matched, row)];
    else if (e.key === 'ArrowLeft' && side === 'R') next = ['L', nearestUnmatched(other, state.matched, row)];
    else if (e.key === 'Escape' && (state.selectedLeft || state.selectedRight)) {
      e.preventDefault();
      dispatch({ type: 'clear-selection' });
      return;
    }
    if (!next) return;
    e.preventDefault();
    if (next[1]) cards.current.get(`${next[0]}:${next[1]}`)?.focus();
  };

  const registerCard = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) cards.current.set(key, el);
    else cards.current.delete(key);
  };


  /* ---------------------------------------------------------- view state */
  const fb = state.feedback;
  const done = state.phase === 'complete';
  const result = done ? matchResult(config, state) : null;
  // The example the learner is working on: being dragged, selected, or just tried.
  const activeLeft = drag?.id ?? state.selectedLeft ?? (fb?.kind === 'incorrect' ? fb.leftId : null);
  const level = activeLeft ? hintLevel(state, activeLeft) : 0;
  const suggested = level === 2 ? activeLeft : null;
  const idle = !drag && !fb && !state.selectedLeft && !state.selectedRight;
  // A wordless cue for the very first move: the first example glows until the learner starts.
  const guideId = !done && idle && state.matched.length === 0 && state.mistakes === 0 ? state.leftOrder[0] : null;
  const choosingRight = Boolean(drag || state.selectedLeft);
  const matchIndex = (id: string) => state.matched.indexOf(id);
  const hintId = (id: string) => `${uid}-hint-${id}`;
  const scoreLine = result ? (result.perfect ? 'Every match right on the first try!' : `${result.correct} of ${result.total} right on the first try.`) : '';

  // One short status line. Names, clues and the final score are added for screen readers only.
  let status: { tone: Tone; text: string; sr?: string } | null = null;
  if (result) status = { tone: 'good', text: '', sr: `All ${total} pairs matched! ${scoreLine}` };
  else if (drag) status = { tone: 'active', text: hoverId ? 'Let go to match!' : 'Drop it on its match.' };
  else if (fb?.kind === 'correct') status = { tone: 'good', text: 'Match!', sr: `${pairs.get(fb.leftId)!.left} goes with ${pairs.get(fb.rightId)!.right}.` };
  else if (fb?.kind === 'incorrect')
    status = { tone: 'retry', text: level === 2 ? 'Not quite. Try the card with the lightbulb.' : 'Not quite. Read the clue.', sr: `Clue: ${pairs.get(fb.leftId)!.hint}` };
  else if (state.selectedLeft || state.selectedRight) status = { tone: 'active', text: 'Now tap its match.' };
  const StatusIcon = status && STATUS_ICON[status.tone];

  const cardBase =
    'relative flex min-h-[56px] w-full rounded-2xl border-2 p-3 text-left text-[0.95rem] font-bold leading-snug transition-[border-color,background-color,box-shadow,opacity,transform] duration-150 sm:p-4 sm:text-base';
  const matchedCard = 'cursor-default border-success/30 bg-success-soft text-success-strong';
  const dragPair = drag ? pairs.get(drag.id) : undefined;

  return (
    <div className="space-y-3">
      {/* ------------------------------------ progress, reset and status */}
      <div className="flex items-center justify-between gap-3">
        <GameProgress done={state.matched.length} total={total} label="matched" />
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

      {/* --------------------------------------------------------- board */}
      <p id={`${uid}-howto`} className="sr-only">
        Choose a card in {quote(config.leftLabel)}, then choose its match in {quote(config.rightLabel)}. Arrow keys move between cards; Escape clears a choice.
      </p>
      <div ref={boardRef} role="group" aria-label="Matching cards" aria-describedby={`${uid}-howto`} className="relative grid grid-cols-2 gap-x-5 sm:gap-x-12 lg:gap-x-16">
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible" aria-hidden="true">
          {state.matched.map((id, i) => (
            <g
              key={id}
              ref={(el) => {
                if (el) lines.current.set(id, el);
                else lines.current.delete(id);
              }}
              fill={pairColor(i)}
            >
              <path pathLength={1} strokeDasharray="1" fill="none" stroke={pairColor(i)} strokeWidth="3" strokeLinecap="round" />
              <circle r="4.5" stroke="white" strokeWidth="2" />
              <circle r="4.5" stroke="white" strokeWidth="2" />
            </g>
          ))}
        </svg>

        <div>
          <p id={`${uid}-left`} className="eyebrow mb-3">
            {config.leftLabel}
          </p>
          <ul aria-labelledby={`${uid}-left`} className="space-y-3">
            {state.leftOrder.map((id, row) => {
              const p = pairs.get(id)!;
              const mi = matchIndex(id);
              const matched = mi >= 0;
              const selected = state.selectedLeft === id;
              const dragging = drag?.id === id;
              const wrong = fb?.kind === 'incorrect' && fb.leftId === id;
              // The clue shows only after a wrong try, and only for the example being worked on.
              const showHint = !matched && activeLeft === id && level >= 1;
              return (
                <li key={id}>
                  <button
                    ref={registerCard(`L:${id}`)}
                    type="button"
                    data-id={id}
                    data-side="L"
                    data-row={row}
                    aria-pressed={matched ? undefined : selected}
                    aria-disabled={matched || undefined}
                    aria-describedby={showHint ? hintId(id) : undefined}
                    tabIndex={matched ? -1 : undefined}
                    onClick={() => onCardClick('L', id)}
                    onKeyDown={onCardKeyDown}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerCancel}
                    onLostPointerCapture={onPointerCancel}
                    className={cn(
                      cardBase,
                      'select-none items-start gap-2',
                      !matched && 'cursor-grab touch-none active:cursor-grabbing',
                      matched
                        ? matchedCard
                        : dragging
                          ? 'border-dashed border-primary/50 bg-primary-soft/40 opacity-50'
                          : selected
                            ? 'border-primary bg-primary-soft shadow-soft'
                            : wrong
                              ? 'border-coral bg-surface shadow-soft'
                              : guideId === id
                                ? cn('border-primary bg-surface', reducedMotion ? 'ring-4 ring-primary/25' : 'animate-pulse-ring')
                                : 'border-line bg-surface shadow-soft hover:border-primary/40',
                    )}
                  >
                    <ExampleFace pair={p} />
                    {matched && <PairBadge index={mi} />}
                    {matched && <span className="sr-only">, matched with {p.right}</span>}
                  </button>
                  {showHint && (
                    <p id={hintId(id)} className={cn('mt-1.5 flex items-start gap-1.5 rounded-xl bg-reward-soft px-3 py-2 text-sm font-semibold leading-snug text-ink-soft', !reducedMotion && 'animate-fade-up')}>
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-reward-strong" aria-hidden="true" />
                      <span>{p.hint}</span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p id={`${uid}-right`} className="eyebrow mb-3">
            {config.rightLabel}
          </p>
          <ul aria-labelledby={`${uid}-right`} className="space-y-3">
            {state.rightOrder.map((id, row) => {
              const p = pairs.get(id)!;
              const mi = matchIndex(id);
              const matched = mi >= 0;
              const selected = state.selectedRight === id;
              const hovered = hoverId === id;
              const isSuggested = !matched && suggested === id;
              const wrong = fb?.kind === 'incorrect' && fb.rightId === id;
              return (
                <li key={id}>
                  <button
                    ref={registerCard(`R:${id}`)}
                    type="button"
                    data-id={id}
                    data-side="R"
                    data-row={row}
                    aria-pressed={matched ? undefined : selected}
                    aria-disabled={matched || undefined}
                    tabIndex={matched ? -1 : undefined}
                    onClick={() => onCardClick('R', id)}
                    onKeyDown={onCardKeyDown}
                    className={cn(
                      cardBase,
                      'items-start gap-2',
                      matched
                        ? matchedCard
                        : hovered
                          ? cn('border-primary bg-primary-soft shadow-lift ring-4 ring-primary/20', !reducedMotion && 'scale-[1.02]')
                          : isSuggested
                            ? 'border-reward bg-reward-soft ring-4 ring-reward/30'
                            : selected
                              ? 'border-primary bg-primary-soft shadow-soft'
                              : wrong
                                ? 'border-coral bg-surface'
                                : choosingRight
                                  ? 'border-dashed border-primary/45 bg-surface hover:border-primary'
                                  : 'border-dashed border-line-strong bg-canvas hover:border-primary/40',
                    )}
                  >
                    {matched && <PairBadge index={mi} />}
                    <span className="min-w-0 flex-1 break-words">{p.right}</span>
                    {isSuggested && (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-reward text-ink">
                        <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">Suggested</span>
                      </span>
                    )}
                    {matched && <span className="sr-only">, matched with {p.left}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* ------------------------------------- finish: one line + optional recap */}
      {result && (
        <section ref={summaryRef} aria-labelledby={`${uid}-done`} className={cn('card scroll-mb-32 scroll-mt-24 p-4 sm:p-5', !reducedMotion && 'animate-pop-in')}>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-success-soft text-success">
              {result.perfect ? <Trophy className="h-6 w-6" aria-hidden="true" /> : <Check className="h-6 w-6" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <h3 id={`${uid}-done`} ref={summaryHeadingRef} tabIndex={-1} className="font-display text-xl font-semibold leading-tight focus:outline-none">
                All {total} pairs matched!
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
          <ul id={`${uid}-learned`} hidden={!showLearned} className="mt-1 space-y-1.5">
            {state.leftOrder.map((id) => {
              const p = pairs.get(id)!;
              return (
                <li key={id} className="flex items-start gap-2 rounded-2xl bg-canvas px-3 py-2 text-sm">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <strong>{p.left}</strong>: {p.right}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* The card being dragged follows the pointer above everything else. */}
      {drag &&
        dragPair &&
        createPortal(
          <div ref={setGhost} className="pointer-events-none fixed left-0 top-0 z-[70]" style={{ width: drag.width }} aria-hidden="true">
            <div
              className={cn(
                'flex min-h-[56px] items-start gap-2 rounded-2xl border-2 border-primary bg-surface p-3 text-left text-[0.95rem] font-bold leading-snug text-ink shadow-float sm:p-4 sm:text-base',
                hoverId && 'ring-4 ring-primary/25',
                !reducedMotion && '-rotate-2 scale-[1.03]',
              )}
            >
              <ExampleFace pair={dragPair} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Icon (stacked above the words on narrow screens) and text of an example card. */
function ExampleFace({ pair }: { pair: Pair }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5 sm:flex-row sm:gap-2.5">
      {pair.leftIcon && (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon name={pair.leftIcon} width={18} height={18} />
        </span>
      )}
      <span className="min-w-0 break-words">{pair.left}</span>
    </span>
  );
}

function PairBadge({ index }: { index: number }) {
  return (
    <span
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white shadow-soft"
      style={{ backgroundColor: pairColor(index) }}
      aria-hidden="true"
    >
      {index + 1}
    </span>
  );
}

/** Compact progress: one dot per pair and "2 / 5". */
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
