import { ArrowRight, Check, ChevronDown, Lightbulb, RotateCcw, Trophy } from 'lucide-react';
import { useEffect, useId, useMemo, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from 'react';
import type { NumberLineConfig } from '../../domain/types';
import { useSound } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { beginPointerDrag, type MiniGameProps } from '../framework';
import {
  canCheck,
  canChoose,
  createNumberLineReducer,
  currentRound,
  formatJump,
  formatTick,
  formatValue,
  initialNumberLineState,
  isLabelled,
  keyIndex,
  LABEL_FONT,
  labelStride,
  labelWidth,
  LINE_X0,
  LINE_X1,
  nearestIndex,
  numberLineHint,
  numberLineResult,
  roundOutcomes,
  startIndex,
  tickCount,
  tickX,
  valueAt,
  VIEW_W,
  wrongChecks,
  type NumberLineRound,
  type NumberLineState,
} from './numberLineLogic';

const SNAP = 'cubic-bezier(.3,1.4,.5,1)';
/** Teardrop pin with its tip at (0, -3), just above the line. */
const PIN_PATH = 'M 0 -3 C -3 -10 -13 -18 -13 -30 A 13 13 0 1 1 13 -30 C 13 -18 3 -10 0 -3 Z';

interface DragState {
  pointerId: number;
  /** Tick the pointer went down on. */
  down: number;
  /** A finger press waits for a lift (a tap) or a slide to another tick (a drag), so a page scroll never moves the marker. */
  pendingTap: boolean;
  last: number;
}

/**
 * Number Line: one task per round. Tap a mark on the line, or drag the pin, to
 * choose a point; in jump rounds an arc shows the jump from the start flag.
 * The line is one keyboard slider (arrow keys, Home/End, Enter to Check).
 * Help appears only after a wrong Check: first a nudge, then the round's hint.
 */
export default function NumberLineGame({ config, reducedMotion, onEvent, onComplete, onRestart }: MiniGameProps<NumberLineConfig>) {
  const reducer = useMemo(() => createNumberLineReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, initialNumberLineState);
  // Set when Check is pressed before it can be used, so the child is told why nothing happened.
  const [checkTooSoon, setCheckTooSoon] = useState(false);
  const [dragging, setDragging] = useState(false);
  const play = useSound();
  const helpId = useId();
  const round = currentRound(config, state);
  const animate = !reducedMotion;

  const callbacks = useRef({ onEvent, onComplete });
  useEffect(() => {
    callbacks.current = { onEvent, onComplete };
  }, [onEvent, onComplete]);

  useEffect(() => {
    callbacks.current.onEvent({ key: 'start' });
  }, []);

  // Sounds, coach events and the single completion report follow phase changes.
  const lastPhase = useRef(state.phase);
  const reported = useRef(false);
  useEffect(() => {
    if (state.phase === lastPhase.current) return;
    lastPhase.current = state.phase;
    const { onEvent: emit, onComplete: complete } = callbacks.current;
    const r = currentRound(config, state);
    if (state.phase === 'correct') {
      play('correct');
      emit({ key: 'round-correct', vars: { explanation: r.explanation } });
    } else if (state.phase === 'incorrect') {
      play('incorrect');
      emit({ key: 'round-incorrect', vars: { hint: numberLineHint(r, state.lastWrong, wrongChecks(state, r))?.text ?? r.hint } });
    } else if (state.phase === 'complete' && !reported.current) {
      reported.current = true;
      const result = numberLineResult(config, state);
      play('reward');
      emit({ key: result.perfect ? 'complete:perfect' : 'complete' });
      complete(result);
    }
  }, [state, config, play]);

  // Keyboard and screen-reader focus follows the game: each new round's task, then the summary.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const shownRound = useRef(state.round);
  useEffect(() => {
    if (state.round === shownRound.current) return;
    shownRound.current = state.round;
    headingRef.current?.focus();
  }, [state.round]);
  useEffect(() => {
    if (state.phase === 'complete') doneRef.current?.focus();
  }, [state.phase]);

  const drag = useRef<DragState | null>(null);

  if (state.phase === 'complete') {
    return <CompleteCard config={config} state={state} animate={animate} headingRef={doneRef} onRestart={onRestart} />;
  }

  const editable = canChoose(state);
  const checkable = canCheck(state);
  const correct = state.phase === 'correct';
  const start = startIndex(round);
  const hint = correct ? null : numberLineHint(round, state.lastWrong, wrongChecks(state, round));
  // The first nudge is about the point that was checked, so it goes once the marker moves;
  // the round's own hint stays until the round is solved.
  const visibleHint = hint && (state.phase === 'incorrect' || hint.level > 1) ? hint : null;
  const lastRound = state.round >= config.rounds.length - 1;
  const waitText = state.phase === 'incorrect' ? 'Move the marker, then press Check.' : start !== null ? 'Tap where the jump lands first.' : 'Tap a point first.';

  // Always dispatched: several pointer moves or keys can arrive before a re-render, and the
  // reducer works from the latest marker position. This render's position only decides the sound.
  const move = (action: { type: 'choose'; index: number } | { type: 'key'; key: string }, to: number | null) => {
    if (!editable) return;
    dispatch(action);
    setCheckTooSoon(false);
    if (to !== null && to !== state.chosen) play('tap');
  };
  const choose = (index: number) => move({ type: 'choose', index }, index);

  const onMainAction = () => {
    setCheckTooSoon(!correct && !checkable);
    if (correct) dispatch({ type: 'next' });
    else if (checkable) dispatch({ type: 'check' });
  };

  /* -------------------------------------------- choosing: tap, drag, keys */

  const tickOf = (el: EventTarget | null, line: Element): number | null => {
    const tick = el instanceof Element ? el.closest('[data-tick]') : null;
    return tick && line.contains(tick) ? Number(tick.getAttribute('data-tick')) : null;
  };

  /** The tick under the pointer: the hit area pressed, else the nearest tick to the pointer's x. */
  const indexAt = (e: ReactPointerEvent<HTMLDivElement>, preferTarget: boolean): number | null => {
    const line = e.currentTarget;
    if (preferTarget) {
      const pressed = tickOf(e.target, line);
      if (pressed !== null) return pressed;
    }
    // Pointer capture keeps the event target fixed while dragging, so measure where the pointer is now.
    const r = line.getBoundingClientRect();
    if (r.width > 0) return nearestIndex(round, ((e.clientX - r.left) / r.width) * VIEW_W);
    const hit = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(e.clientX, e.clientY) : null;
    return tickOf(hit, line) ?? tickOf(e.target, line);
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable || e.button > 0) return;
    const index = indexAt(e, true);
    if (index === null) return;
    beginPointerDrag(e);
    const mouse = e.pointerType === 'mouse';
    if (mouse) e.currentTarget.focus({ preventScroll: true });
    drag.current = { pointerId: e.pointerId, down: index, pendingTap: !mouse, last: index };
    setDragging(true);
    // A mouse press chooses straight away; a finger waits to see if it is a tap, a drag or a scroll.
    if (mouse) choose(index);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    if (e.buttons === 0) {
      endDrag(); // released somewhere we did not hear about
      return;
    }
    const index = indexAt(e, false);
    if (index === null || index === d.last) return;
    d.pendingTap = false;
    d.last = index;
    choose(index);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d && d.pendingTap && e.pointerId === d.pointerId) choose(d.down);
    endDrag();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!correct) onMainAction();
      return;
    }
    const index = keyIndex(round, state.chosen, e.key);
    if (index === null) return;
    e.preventDefault();
    move({ type: 'key', key: e.key }, index);
  };

  const fmt = (index: number) => formatTick(round, index);
  const sliderLabel = `Number line from ${formatValue(round.from, round.format)} to ${formatValue(round.to, round.format)}${start !== null ? `. The jump starts at ${fmt(start)}` : ''}`;
  const valueNow = valueAt(round, state.chosen ?? start ?? 0);
  const valueText =
    state.chosen === null
      ? start !== null
        ? `No jump yet. Start at ${fmt(start)}`
        : 'No point chosen yet'
      : start === null
        ? fmt(state.chosen)
        : state.chosen === start
          ? `${fmt(start)}, the start`
          : `${fmt(state.chosen)}, a jump of ${formatJump(round, start, state.chosen)} from ${fmt(start)}`;

  // One line under the line: the result, a hint, or why Check is not ready yet.
  let feedback: ReactNode = null;
  if (correct) {
    feedback = (
      <p className={cn('flex items-start justify-center gap-2 font-bold text-success-strong', animate && 'animate-fade-up')}>
        <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> {round.explanation}
      </p>
    );
  } else if (visibleHint) {
    feedback = (
      <p key={visibleHint.level} className={cn('flex items-start justify-center gap-2 font-bold text-ink', animate && state.phase === 'incorrect' && 'animate-fade-up')}>
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-reward-strong" aria-hidden="true" /> {visibleHint.text}
      </p>
    );
  } else if (checkTooSoon && !checkable) {
    feedback = (
      <p id={helpId} className="font-bold text-ink-soft">
        {waitText}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 ref={headingRef} tabIndex={-1} className="min-w-0 font-display text-xl font-semibold leading-snug text-ink focus:outline-none sm:text-2xl">
          <span className="sr-only">
            Round {state.round + 1} of {config.rounds.length}:
          </span>{' '}
          {round.prompt}
        </h3>
        <RoundDots total={config.rounds.length} current={state.round} currentDone={correct} />
      </div>

      {/* The one play area: the number line and what is chosen on it. */}
      <div className={cn('card p-3 sm:p-6', correct && 'ring-4 ring-success/30')}>
        <div className={cn(state.phase === 'incorrect' && animate && 'animate-shake')}>
          <div
            role="slider"
            tabIndex={editable ? 0 : -1}
            aria-label={sliderLabel}
            aria-valuemin={round.from}
            aria-valuemax={round.to}
            aria-valuenow={valueNow}
            aria-valuetext={valueText}
            aria-disabled={!editable || undefined}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            className={cn(
              'mx-auto max-w-xl touch-pan-y select-none rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-primary/40',
              editable ? (dragging ? 'cursor-grabbing' : 'cursor-pointer') : 'cursor-default',
            )}
          >
            <LineDrawing round={round} chosen={state.chosen} phase={state.phase} animate={animate} dragging={dragging} editable={editable} />
          </div>
        </div>
        <p data-readout="" className="mt-1 text-center font-display text-xl font-semibold text-ink">
          You chose: <span className={state.chosen === null ? 'text-ink-muted' : correct ? 'text-success-strong' : 'text-primary-strong'}>{state.chosen === null ? '?' : fmt(state.chosen)}</span>
        </p>
      </div>

      <div aria-live="polite" className="min-h-[1.75rem] text-center">
        {feedback}
      </div>

      <button
        type="button"
        className={cn(
          'btn btn-lg w-full sm:mx-auto sm:flex sm:w-auto sm:min-w-[14rem]',
          correct ? 'btn-primary' : 'btn-success aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:translate-y-0',
        )}
        aria-disabled={!correct && !checkable}
        aria-describedby={!correct && !checkable ? helpId : undefined}
        onClick={onMainAction}
      >
        {correct ? (
          lastRound ? (
            <>
              <Trophy className="h-5 w-5" aria-hidden="true" /> Finish
            </>
          ) : (
            <>
              Next <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </>
          )
        ) : (
          <>
            <Check className="h-5 w-5" aria-hidden="true" /> Check
          </>
        )}
      </button>
      {!correct && !checkable && !(checkTooSoon && !visibleHint) && (
        <span id={helpId} className="sr-only">
          {waitText}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- the drawing */

function LineDrawing({
  round,
  chosen,
  phase,
  animate,
  dragging,
  editable,
}: {
  round: NumberLineRound;
  chosen: number | null;
  phase: NumberLineState['phase'];
  animate: boolean;
  dragging: boolean;
  editable: boolean;
}) {
  const start = startIndex(round);
  // Jump rounds need headroom for the arc and its label.
  const lineY = start !== null ? 96 : 56;
  const height = lineY + 42;
  const last = tickCount(round) - 1;
  const stride = labelStride(round);
  const xs = Array.from({ length: last + 1 }, (_, i) => tickX(round, i));

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${height}`} className="block h-auto w-full" aria-hidden="true" focusable="false">
      {/* The line carries on both ways, so it has an arrow tip at each end. */}
      <line x1={LINE_X0 - 12} y1={lineY} x2={LINE_X1 + 12} y2={lineY} className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
      <path d={`M ${LINE_X0 - 21} ${lineY} l 10 -6.5 v 13 Z`} className="fill-ink" />
      <path d={`M ${LINE_X1 + 21} ${lineY} l -10 -6.5 v 13 Z`} className="fill-ink" />

      {xs.map((x, i) => {
        const major = isLabelled(i, stride);
        return <line key={i} x1={x} x2={x} y1={lineY - (major ? 10 : 6)} y2={lineY + (major ? 10 : 6)} className={major ? 'stroke-ink' : 'stroke-ink-soft'} strokeWidth={major ? 2.5 : 2} strokeLinecap="round" />;
      })}
      {xs.map((x, i) =>
        isLabelled(i, stride) ? (
          <text key={i} x={x} y={lineY + 32} textAnchor="middle" fontSize={LABEL_FONT} fontWeight={800} className={i !== chosen ? 'fill-ink' : phase === 'correct' ? 'fill-success-strong' : phase === 'incorrect' ? 'fill-coral-strong' : 'fill-primary-strong'}>
            {formatTick(round, i)}
          </text>
        ) : null,
      )}

      {start !== null && <StartFlag x={xs[start]} y={lineY} side={chosen !== null && chosen < start ? 1 : -1} />}
      {start !== null && chosen !== null && chosen !== start && <JumpArc x1={xs[start]} x2={xs[chosen]} y={lineY} label={formatJump(round, start, chosen)} animate={animate} />}
      {chosen !== null && <Marker x={xs[chosen]} y={lineY} phase={phase} glide={animate && !dragging} />}

      {/* Invisible hit areas, one per tick, as tall as the drawing and as wide as the gap between ticks. */}
      {xs.map((x, i) => {
        const left = i === 0 ? 0 : (xs[i - 1] + x) / 2;
        const right = i === last ? VIEW_W : (x + xs[i + 1]) / 2;
        return <rect key={i} data-tick={i} x={left} y={0} width={right - left} height={height} fill="transparent" className={editable ? 'cursor-pointer' : undefined} />;
      })}
    </svg>
  );
}

/** The start of a jump. The pennant flies away from the jump (`side` -1: left, 1: right) so it never covers the arc. */
function StartFlag({ x, y, side }: { x: number; y: number; side: -1 | 1 }) {
  return (
    <g data-start-flag="">
      <line x1={x} y1={y} x2={x} y2={y - 34} className="stroke-ink" strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M ${x} ${y - 34} L ${x + side * 20} ${y - 27.5} L ${x} ${y - 21} Z`} className="fill-coral" />
      <circle cx={x} cy={y} r="6" className="fill-coral" stroke="white" strokeWidth="2" />
    </g>
  );
}

/** The jump from the start flag to the chosen point, with its size ("+4", "−3") on top. */
function JumpArc({ x1, x2, y, label, animate }: { x1: number; x2: number; y: number; label: string; animate: boolean }) {
  const base = y - 8;
  // Tall enough for the label to clear the pin, low enough to fit the drawing.
  const h = Math.min(56, Math.max(36, Math.abs(x2 - x1) * 0.35));
  const mid = (x1 + x2) / 2;
  const pillW = labelWidth(label) + 16;
  const pillX = Math.min(VIEW_W - pillW / 2 - 2, Math.max(pillW / 2 + 2, mid));
  const pillY = base - h - 26;
  return (
    <g data-jump-arc="" className={cn(animate && 'animate-fade-in')}>
      <path d={`M ${x1} ${base} Q ${mid} ${base - 2 * h} ${x2} ${base}`} fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 5" />
      <rect x={pillX - pillW / 2} y={pillY} width={pillW} height={22} rx={11} className="fill-primary" />
      <text x={pillX} y={pillY + 16.5} textAnchor="middle" fontSize={15} fontWeight={800} fill="white">
        {label}
      </text>
    </g>
  );
}

function Marker({ x, y, phase, glide }: { x: number; y: number; phase: NumberLineState['phase']; glide: boolean }) {
  return (
    <g data-marker="" style={{ transform: `translate(${x}px, ${y}px)`, transition: glide ? `transform 180ms ${SNAP}` : 'none' }}>
      <path d={PIN_PATH} className={phase === 'correct' ? 'fill-success' : phase === 'incorrect' ? 'fill-coral' : 'fill-primary'} stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="0" cy="-30" r="5" fill="white" />
    </g>
  );
}

/* ------------------------------------------------------- progress, summary */

/** Compact progress: one dot per round (green when done, a longer dot for the round being played). */
function RoundDots({ total, current, currentDone }: { total: number; current: number; currentDone: boolean }) {
  return (
    <ol className="mt-2 flex shrink-0 items-center gap-1.5" aria-label="Round progress">
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
  );
}

function CompleteCard({
  config,
  state,
  animate,
  headingRef,
  onRestart,
}: {
  config: NumberLineConfig;
  state: NumberLineState;
  animate: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  onRestart(): void;
}) {
  const [showRounds, setShowRounds] = useState(false);
  const listId = useId();
  const result = numberLineResult(config, state);
  return (
    <div className={cn('card p-5 text-center sm:p-6', animate && 'animate-pop-in')}>
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
        <Trophy className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold focus:outline-none">
        Every point found!
      </h3>
      <p className="mt-1 text-ink-soft">
        {result.correct} of {result.total} right on the first try{result.perfect ? '. Perfect!' : '.'}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="btn btn-secondary" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Play again
        </button>
        <button type="button" className="btn btn-ghost min-h-[44px] px-3 text-sm" aria-expanded={showRounds} aria-controls={listId} onClick={() => setShowRounds((s) => !s)}>
          Your rounds <ChevronDown className={cn('h-4 w-4', showRounds && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>
      {showRounds && (
        <ol id={listId} className="mt-4 grid gap-2 text-left sm:grid-cols-2" aria-label="Your rounds">
          {roundOutcomes(config, state).map((o, i) => (
            <li key={o.id} className="flex items-center gap-3 rounded-2xl bg-canvas-sunken/70 px-3 py-2.5">
              <span className="grid h-10 min-w-[2.5rem] shrink-0 place-items-center rounded-xl bg-primary-soft px-2 font-display text-lg font-semibold text-primary-strong" aria-hidden="true">
                {o.answer}
              </span>
              <span className="min-w-0 flex-1 text-sm font-bold">
                Round {i + 1}: {o.prompt} <span className="sr-only">Answer: {o.answer}.</span>
              </span>
              <span className={cn('chip shrink-0 text-xs', o.firstTry ? 'bg-success-soft text-success-strong' : 'bg-reward-soft text-reward-strong')}>{o.firstTry ? 'First try' : `${o.wrong + 1} tries`}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
