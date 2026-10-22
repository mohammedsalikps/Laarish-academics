import { ArrowRight, Check, ChevronDown, Lightbulb, Minus, Plus, RotateCcw, Trophy } from 'lucide-react';
import { useEffect, useId, useMemo, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from 'react';
import type { AreaGridConfig } from '../../domain/types';
import { useSound } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { beginPointerDrag, type MiniGameProps } from '../framework';
import {
  areaHint,
  areaOf,
  areaResult,
  areaUnit,
  canCheck,
  canEdit,
  cellAt,
  createAreaReducer,
  currentRound,
  hasRectangle,
  initialAreaState,
  lengthUnit,
  perimeterOf,
  roundOutcomes,
  sameSize,
  steppedSize,
  wrongChecks,
  type AreaState,
  type Size,
} from './areaLogic';

/* Grid drawing, in SVG units. The SVG scales to the card's width, so cells stay square on any phone. */
const CELL = 40;
/** Room for the side-length labels along the top and the left of the rectangle. */
const PAD_T = 34;
const PAD_L = 64;
const PAD_R = 6;
const PAD_B = 6;
/** Largest a cell gets on a wide screen, in CSS px. */
const MAX_CELL_PX = 52;

const ARROWS: Record<string, [keyof Size, 1 | -1]> = { ArrowRight: ['width', 1], ArrowLeft: ['width', -1], ArrowDown: ['height', 1], ArrowUp: ['height', -1] };

/**
 * Area Builder: make a rectangle on a square grid with the area and/or
 * perimeter the round asks for. The rectangle starts at the top-left corner:
 * drag (or tap a square) to set its opposite corner, or use the Width and
 * Height steppers. One task per round, one Check / Next button.
 */
export default function AreaBuilder({ config, reducedMotion, onEvent, onComplete, onRestart }: MiniGameProps<AreaGridConfig>) {
  const reducer = useMemo(() => createAreaReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, initialAreaState);
  // Set when Check is pressed before it can be used, so the child is told why nothing happened.
  const [checkTooSoon, setCheckTooSoon] = useState(false);
  const play = useSound();
  const helpId = useId();
  const keysId = useId();
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
      emit({ key: 'round-incorrect', vars: { hint: areaHint(r, state.lastWrong, wrongChecks(state, r))?.text ?? r.hint } });
    } else if (state.phase === 'complete' && !reported.current) {
      reported.current = true;
      const result = areaResult(config, state);
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

  /* ------------------------------------------------ drawing: drag, tap, keys */
  const gridRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; last: string } | null>(null);

  if (state.phase === 'complete') {
    return <CompleteCard config={config} state={state} animate={animate} headingRef={doneRef} onRestart={onRestart} />;
  }

  const editable = canEdit(state);
  const checkable = canCheck(state);
  const correct = state.phase === 'correct';
  const drawn = hasRectangle(state);
  const hint = correct ? null : areaHint(round, state.lastWrong, wrongChecks(state, round));
  // The first nudge talks about the rectangle that was checked, so it goes once the rectangle changes;
  // the round's own hint stays until the round is solved.
  const visibleHint = hint && (state.phase === 'incorrect' || hint.level > 1) ? hint : null;
  const lastRound = state.round >= config.rounds.length - 1;
  const waitText = state.phase === 'incorrect' ? 'Change your rectangle, then press Check.' : 'Draw a rectangle first.';
  const viewW = PAD_L + config.cols * CELL + PAD_R;
  const viewH = PAD_T + config.rows * CELL + PAD_B;

  const resize = (next: Size | null) => {
    if (!next || !editable || sameSize(next, state)) return;
    dispatch({ type: 'set', width: next.width, height: next.height });
    setCheckTooSoon(false);
    play('tap');
  };
  const step = (side: keyof Size, by: 1 | -1) => resize(steppedSize(config, state, side, by));

  /** The square under the pointer. Measured from the grid's box, because a captured pointer keeps its first target. */
  const squareAt = (e: ReactPointerEvent<HTMLDivElement>): { col: number; row: number } | null => {
    const box = gridRef.current?.getBoundingClientRect();
    if (box && box.width > 0 && box.height > 0) {
      const x = (((e.clientX - box.left) / box.width) * viewW - PAD_L) / CELL;
      const y = (((e.clientY - box.top) / box.height) * viewH - PAD_T) / CELL;
      return cellAt(x, y, config);
    }
    // No layout (e.g. not rendered yet): fall back to the square that was hit.
    const cell = e.target instanceof Element ? e.target.closest('[data-col]') : null;
    return cell ? { col: Number(cell.getAttribute('data-col')), row: Number(cell.getAttribute('data-row')) } : null;
  };
  const drawTo = (e: ReactPointerEvent<HTMLDivElement>) => {
    const square = squareAt(e);
    if (!square || !drag.current) return;
    const key = `${square.col},${square.row}`;
    if (key === drag.current.last) return;
    drag.current.last = key;
    resize({ width: square.col + 1, height: square.row + 1 });
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable || e.button !== 0) return;
    beginPointerDrag(e);
    drag.current = { pointerId: e.pointerId, last: '' };
    drawTo(e);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    if (e.buttons === 0) {
      drag.current = null; // released somewhere we did not hear about
      return;
    }
    drawTo(e);
  };
  const endDrag = () => {
    drag.current = null;
  };

  const onMainAction = () => {
    setCheckTooSoon(!correct && !checkable);
    if (correct) dispatch({ type: 'next' });
    else if (checkable) dispatch({ type: 'check' });
  };

  const onGridKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onMainAction();
    } else if (e.key in ARROWS) {
      e.preventDefault();
      step(...ARROWS[e.key]);
    }
  };

  // One line under the grid: the result, a hint, or why Check is not ready yet.
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

      {/* The one play area: the live measurements, the grid, and the steppers. */}
      <div className={cn('card p-3 sm:p-6', correct && 'ring-4 ring-success/30')}>
        <Readout state={state} round={round} animate={animate} />

        <div
          ref={gridRef}
          role="group"
          tabIndex={0}
          aria-label={`Grid, ${config.cols} by ${config.rows} squares. ${drawn ? `Your rectangle is ${state.width} wide and ${state.height} tall.` : 'No rectangle yet.'}`}
          aria-describedby={keysId}
          className={cn(
            'mx-auto mt-3 touch-none select-none rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-primary/40',
            editable ? 'cursor-crosshair' : 'cursor-default',
            state.phase === 'incorrect' && animate && 'animate-shake',
          )}
          style={{ maxWidth: `${(viewW * MAX_CELL_PX) / CELL}px` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onKeyDown={onGridKey}
        >
          <Grid config={config} size={state} round={round} correct={correct} firstMove={!drawn && editable} animate={animate} viewW={viewW} viewH={viewH} />
        </div>
        <span id={keysId} className="sr-only">
          Drag from the top-left square, or tap a square, to make a rectangle. Arrow keys change the width and height. Press Enter to check.
        </span>

        <div className="mt-3 flex flex-wrap items-start justify-center gap-x-6 gap-y-2">
          <Stepper label="Width" value={state.width} max={config.cols} disabled={!editable} onStep={(by) => step('width', by)} />
          <Stepper label="Height" value={state.height} max={config.rows} disabled={!editable} onStep={(by) => step('height', by)} />
        </div>
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

/* --------------------------------------------------------------------- grid */

function Grid({
  config,
  size,
  round,
  correct,
  firstMove,
  animate,
  viewW,
  viewH,
}: {
  config: AreaGridConfig;
  size: Size;
  round: AreaGridConfig['rounds'][number];
  correct: boolean;
  firstMove: boolean;
  animate: boolean;
  viewW: number;
  viewH: number;
}) {
  const drawn = hasRectangle(size);
  const unit = lengthUnit(round);
  // Short units ("cm", "m") fit next to the sides; longer ones are left to the readout.
  const sideLabel = (n: number) => (unit.length <= 3 ? `${n} ${unit}` : String(n));
  const rectW = size.width * CELL;
  const rectH = size.height * CELL;
  return (
    <svg viewBox={`0 0 ${viewW} ${viewH}`} className="block h-auto w-full" aria-hidden="true">
      {Array.from({ length: config.rows }, (_, row) =>
        Array.from({ length: config.cols }, (_, col) => {
          const inside = col < size.width && row < size.height;
          return (
            <rect
              key={`${col},${row}`}
              data-col={col}
              data-row={row}
              x={PAD_L + col * CELL}
              y={PAD_T + row * CELL}
              width={CELL}
              height={CELL}
              strokeWidth="2"
              className={cn('stroke-line', inside ? (correct ? 'fill-success/25' : 'fill-primary/25') : 'fill-surface', animate && 'transition-colors duration-150')}
            />
          );
        }),
      )}
      {drawn && (
        <>
          <rect x={PAD_L} y={PAD_T} width={rectW} height={rectH} rx="3" fill="none" strokeWidth="4" strokeLinejoin="round" pointerEvents="none" className={correct ? 'stroke-success' : 'stroke-primary'} />
          <text x={PAD_L + rectW / 2} y={PAD_T - 10} textAnchor="middle" fontSize="20" fontWeight="700" className={cn('font-display', correct ? 'fill-success-strong' : 'fill-primary-strong')}>
            {sideLabel(size.width)}
          </text>
          <text x={PAD_L - 9} y={PAD_T + rectH / 2} textAnchor="end" dominantBaseline="central" fontSize="20" fontWeight="700" className={cn('font-display', correct ? 'fill-success-strong' : 'fill-primary-strong')}>
            {sideLabel(size.height)}
          </text>
          {!correct && <circle cx={PAD_L + rectW} cy={PAD_T + rectH} r="9" strokeWidth="3" pointerEvents="none" className="fill-surface stroke-primary" />}
        </>
      )}
      {/* The rectangle always starts here. */}
      <circle cx={PAD_L} cy={PAD_T} r="6" pointerEvents="none" className={correct ? 'fill-success' : 'fill-primary'} />
      {firstMove && (
        <rect x={PAD_L + 4} y={PAD_T + 4} width={CELL - 8} height={CELL - 8} rx="6" fill="none" strokeWidth="4" pointerEvents="none" className={cn('stroke-reward', animate && 'animate-pulse')} />
      )}
    </svg>
  );
}

/** "Width  − 3 +": one of the two accessible alternatives to drawing on the grid. */
function Stepper({ label, value, max, disabled, onStep }: { label: string; value: number; max: number; disabled: boolean; onStep(by: 1 | -1): void }) {
  const canLess = !disabled && value > 1;
  const canMore = !disabled && value < max;
  const button = 'grid h-11 w-11 place-items-center rounded-xl border-2 border-line bg-surface text-ink hover:border-primary/50 aria-disabled:cursor-not-allowed aria-disabled:hover:border-line aria-disabled:opacity-40';
  return (
    <div role="group" aria-label={label} className="flex flex-col items-center">
      <span className="eyebrow mb-1" aria-hidden="true">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button type="button" className={button} aria-label={`${label} minus 1`} aria-disabled={!canLess} onClick={() => canLess && onStep(-1)}>
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="min-w-[2.5rem] text-center font-display text-2xl font-semibold tabular-nums">{value}</span>
        <button type="button" className={button} aria-label={`${label} plus 1`} aria-disabled={!canMore} onClick={() => canMore && onStep(1)}>
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Live measurements of the rectangle; the ones the round asks for are highlighted. */
function Readout({ state, round, animate }: { state: AreaState; round: AreaGridConfig['rounds'][number]; animate: boolean }) {
  const a = areaOf(state);
  const p = perimeterOf(state);
  // Re-keyed on change so the new number pops in.
  const num = (n: number) => (
    <span key={animate ? n : undefined} className={cn('inline-block tabular-nums', animate && 'animate-pop-in')}>
      {n}
    </span>
  );
  return (
    <p role="status" className="text-center font-display text-lg font-semibold sm:text-xl">
      <span className={round.area !== undefined ? 'text-primary-strong' : 'text-ink-soft'}>
        Area: {num(a)} {areaUnit(round, a)}
      </span>
      <span className="text-ink-muted"> · </span>
      <span className={cn('whitespace-nowrap', round.perimeter !== undefined ? 'text-primary-strong' : 'text-ink-soft')}>
        Perimeter: {num(p)} {lengthUnit(round, p)}
      </span>
    </p>
  );
}

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

function CompleteCard({ config, state, animate, headingRef, onRestart }: { config: AreaGridConfig; state: AreaState; animate: boolean; headingRef: Ref<HTMLHeadingElement>; onRestart(): void }) {
  const [showRounds, setShowRounds] = useState(false);
  const listId = useId();
  const result = areaResult(config, state);
  return (
    <div className={cn('card p-5 text-center sm:p-6', animate && 'animate-pop-in')}>
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
        <Trophy className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold focus:outline-none">
        Every rectangle is built!
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
              <span className="min-w-0 flex-1 text-sm font-bold">
                Round {i + 1}: {o.goal}
                {o.built && <span className="block font-semibold text-ink-soft">You built {o.built.width} by {o.built.height}</span>}
              </span>
              <span className={cn('chip shrink-0 text-xs', o.firstTry ? 'bg-success-soft text-success-strong' : 'bg-reward-soft text-reward-strong')}>{o.firstTry ? 'First try' : `${o.wrong + 1} tries`}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
