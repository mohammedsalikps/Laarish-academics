import { ArrowRight, Check, ChevronDown, Lightbulb, RotateCcw, Ruler, Target, Trophy } from 'lucide-react';
import { useEffect, useId, useMemo, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from 'react';
import { useSound } from '../../hooks/usePreferences';
import type { FractionBuilderConfig } from '../../domain/types';
import { cn } from '../../lib/cn';
import { beginPointerDrag, type MiniGameProps } from '../framework';
import {
  canCheck,
  canShade,
  createFractionReducer,
  currentRound,
  equalPartsNote,
  formatFraction,
  fractionName,
  fractionResult,
  initialFractionState,
  roundHint,
  roundOutcomes,
  shadedWords,
  targetFraction,
  wrongChecks,
  type Fraction,
  type FractionRound,
  type FractionState,
} from './fractionLogic';

const SHADE = '#5847E0';
const ROTI = { crust: '#E9C48A', fill: '#F5D9A8', label: '#7A4A1E' };
const CHOCOLATE = '#6B3F1E';
/** Amber outline used by the "Equal parts?" view and the first-move cue. */
const EQUAL_LINE = '#F2A516';

function pieSlice(i: number, parts: number, cx: number, cy: number, r: number): string {
  if (parts === 1) return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
  const a0 = (i / parts) * Math.PI * 2 - Math.PI / 2;
  const a1 = ((i + 1) / parts) * Math.PI * 2 - Math.PI / 2;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} Z`;
}

/** Middle of a slice, where its "1/4" label sits. */
function sliceCentre(i: number, parts: number, cx: number, cy: number, r: number): [number, number] {
  if (parts === 1) return [cx, cy];
  const a = ((i + 0.5) / parts) * Math.PI * 2 - Math.PI / 2;
  return [cx + r * 0.58 * Math.cos(a), cy + r * 0.58 * Math.sin(a)];
}

/**
 * Fair Share Kitchen: shade equal parts of a roti or chocolate bar to build a
 * fraction. One task per round: the shape, the live fraction next to the
 * target, and one Check / Next button. Pieces can be tapped one at a time or
 * painted by dragging across them. Extra help (the equal-parts view, hints)
 * appears only when asked for or after a wrong Check.
 */
export default function FractionBuilder({ config, reducedMotion, onEvent, onComplete, onRestart }: MiniGameProps<FractionBuilderConfig>) {
  const reducer = useMemo(() => createFractionReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, initialFractionState);
  // The round the "Equal parts?" view is open for, so it closes itself on the next round.
  const [partsOpenFor, setPartsOpenFor] = useState<number | null>(null);
  // Set when Check is pressed before it can be used, so the child is told why nothing happened.
  const [checkTooSoon, setCheckTooSoon] = useState(false);
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
      emit({ key: 'round-incorrect', vars: { hint: roundHint(r, state.lastWrong, wrongChecks(state, r))?.text ?? r.hint } });
    } else if (state.phase === 'complete' && !reported.current) {
      reported.current = true;
      const result = fractionResult(config, state);
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

  /* ------------------------------------------------ shading: tap, paint, keys */
  const shapeRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; on: boolean; last: number } | null>(null);
  // A pointer press shades its piece straight away, so the click that follows it is ignored.
  const pressed = useRef(false);

  if (state.phase === 'complete') {
    return <CompleteCard config={config} state={state} animate={animate} headingRef={doneRef} onRestart={onRestart} />;
  }

  const editable = canShade(state);
  const checkable = canCheck(state);
  const correct = state.phase === 'correct';
  const firstMove = !state.started && editable;
  const showParts = editable && partsOpenFor === state.round;
  const hint = correct ? null : roundHint(round, state.lastWrong, wrongChecks(state, round));
  // The first nudge talks about the shading that was checked, so it goes once the shading changes;
  // the specific hints stay until the round is solved.
  const visibleHint = hint && (state.phase === 'incorrect' || hint.level > 1) ? hint : null;
  const lastRound = state.round >= config.rounds.length - 1;
  const waitText = state.phase === 'incorrect' ? 'Change your shading, then press Check.' : 'Shade some parts first.';

  const setPiece = (piece: number, on: boolean) => {
    if (!editable || state.shaded.includes(piece) === on) return;
    dispatch({ type: 'paint', piece, on });
    setCheckTooSoon(false);
    play('tap');
  };
  const toggle = (piece: number) => setPiece(piece, !state.shaded.includes(piece));

  const pieceAt = (e: ReactPointerEvent): number | null => {
    // Pointer capture keeps the event target fixed, so hit-test where the finger is now.
    const hit = typeof document.elementFromPoint === 'function' ? document.elementFromPoint(e.clientX, e.clientY) : null;
    const el = hit ?? e.target;
    const piece = el instanceof Element && shapeRef.current?.contains(el) ? el.closest('[data-piece]') : null;
    return piece ? Number(piece.getAttribute('data-piece')) : null;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable || e.button !== 0) return;
    const piece = pieceAt(e);
    if (piece === null) return;
    beginPointerDrag(e);
    // The first piece decides the stroke: start on an empty piece to shade, on a shaded one to erase.
    const on = !state.shaded.includes(piece);
    drag.current = { pointerId: e.pointerId, on, last: piece };
    pressed.current = true;
    setPiece(piece, on);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    if (e.buttons === 0) {
      drag.current = null; // released somewhere we did not hear about
      return;
    }
    const piece = pieceAt(e);
    if (piece === null || piece === d.last) return;
    d.last = piece;
    setPiece(piece, d.on);
  };
  const endDrag = () => {
    drag.current = null;
  };

  const onPieceClick = (piece: number) => {
    if (pressed.current) {
      pressed.current = false;
      return;
    }
    toggle(piece); // keyboard or assistive-technology activation
  };
  const onPieceKey = (e: ReactKeyboardEvent, piece: number) => {
    pressed.current = false;
    // Real <button>s turn Enter and Space into a click by themselves; SVG slices need it done here.
    if (e.currentTarget instanceof HTMLButtonElement) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(piece);
    }
  };

  const clear = () => {
    dispatch({ type: 'clear' });
    play('tap');
    shapeRef.current?.querySelector<HTMLElement | SVGElement>('[data-piece="0"]')?.focus();
  };

  const onMainAction = () => {
    setCheckTooSoon(!correct && !checkable);
    if (correct) dispatch({ type: 'next' });
    else if (checkable) dispatch({ type: 'check' });
  };

  const shapeProps: ShapeProps = { round, shaded: state.shaded, editable, showParts, firstMove, animate, onPieceClick, onPieceKey };

  // One line under the shape: the result, a hint, or why Check is not ready yet.
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

      {/* The one play area: live fraction and target, then the shape. */}
      <div className={cn('card p-4 sm:p-6', correct && 'ring-4 ring-success/30')}>
        <Readout shaded={state.shaded.length} parts={round.parts} target={targetFraction(round)} correct={correct} animate={animate} />
        <div
          ref={shapeRef}
          className={cn('mt-4 touch-none select-none rounded-3xl', state.phase === 'incorrect' && animate && 'animate-shake')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onClick={() => {
            pressed.current = false;
          }}
        >
          {round.shape === 'circle' ? <Roti {...shapeProps} /> : <Bar {...shapeProps} />}
        </div>
        {editable && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              aria-pressed={showParts}
              className={cn('btn btn-ghost min-h-[44px] px-3 text-sm', showParts && 'bg-reward-soft text-reward-strong hover:bg-reward-soft')}
              onClick={() => {
                setPartsOpenFor(showParts ? null : state.round);
                play('tap');
              }}
            >
              <Ruler className="h-4 w-4" aria-hidden="true" /> Equal parts?
            </button>
            {state.shaded.length > 0 && (
              <button type="button" className="btn btn-ghost min-h-[44px] px-3 text-sm" aria-label="Clear shading" onClick={clear}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear
              </button>
            )}
          </div>
        )}
        {showParts && (
          <p role="status" className={cn('mt-1 text-center text-sm font-bold text-ink-soft', animate && 'animate-fade-in')}>
            {equalPartsNote(round)}
          </p>
        )}
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

/* ------------------------------------------------------------------- shapes */

interface ShapeProps {
  round: FractionRound;
  shaded: number[];
  editable: boolean;
  showParts: boolean;
  firstMove: boolean;
  animate: boolean;
  onPieceClick(piece: number): void;
  onPieceKey(e: ReactKeyboardEvent, piece: number): void;
}

function Roti({ round, shaded, editable, showParts, firstMove, animate, onPieceClick, onPieceKey }: ShapeProps) {
  const pieces = Array.from({ length: round.parts }, (_, i) => i);
  const unit = formatFraction({ numerator: 1, denominator: round.parts });
  return (
    <svg viewBox="0 0 220 220" className="mx-auto block aspect-square w-full max-w-[15rem]" role="group" aria-label={`Roti cut into ${round.parts} equal parts`}>
      <circle cx="110" cy="110" r="105" fill={ROTI.crust} />
      {pieces.map((i) => {
        const on = shaded.includes(i);
        return (
          <path
            key={i}
            data-piece={i}
            d={pieSlice(i, round.parts, 110, 110, 97)}
            fill={on ? SHADE : ROTI.fill}
            stroke={showParts ? EQUAL_LINE : '#fff'}
            strokeWidth={showParts ? 5 : 4}
            strokeDasharray={showParts ? '12 7' : undefined}
            strokeLinejoin="round"
            role="button"
            aria-pressed={on}
            aria-label={`Part ${i + 1} of ${round.parts}`}
            aria-disabled={!editable || undefined}
            tabIndex={editable ? 0 : -1}
            className={cn('focus-visible:stroke-ink', animate && 'transition-[fill] duration-150', editable ? 'cursor-pointer' : 'cursor-default')}
            onClick={() => onPieceClick(i)}
            onKeyDown={(e) => onPieceKey(e, i)}
          />
        );
      })}
      {firstMove && (
        <path d={pieSlice(0, round.parts, 110, 110, 90)} fill="none" stroke={EQUAL_LINE} strokeWidth="6" strokeLinejoin="round" pointerEvents="none" className={cn(animate && 'animate-pulse')} aria-hidden="true" />
      )}
      {showParts &&
        pieces.map((i) => {
          const [x, y] = sliceCentre(i, round.parts, 110, 110, 97);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontFamily="Fredoka Variable, Nunito Variable, sans-serif" fontWeight="700" fontSize="22" fill={shaded.includes(i) ? '#fff' : ROTI.label} pointerEvents="none" aria-hidden="true">
              {unit}
            </text>
          );
        })}
    </svg>
  );
}

function Bar({ round, shaded, editable, showParts, firstMove, animate, onPieceClick, onPieceKey }: ShapeProps) {
  const pieces = Array.from({ length: round.parts }, (_, i) => i);
  const unit = formatFraction({ numerator: 1, denominator: round.parts });
  // Long bars wrap into two rows of squares so every piece stays a big touch target.
  const cols = round.parts <= 6 ? round.parts : Math.ceil(round.parts / 2);
  return (
    <div
      role="group"
      aria-label={`Chocolate bar with ${round.parts} equal parts`}
      className="mx-auto grid w-full max-w-md gap-1 overflow-hidden rounded-2xl border-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, borderColor: CHOCOLATE, backgroundColor: CHOCOLATE }}
    >
      {pieces.map((i) => {
        const on = shaded.includes(i);
        return (
          <button
            key={i}
            type="button"
            data-piece={i}
            aria-pressed={on}
            aria-label={`Part ${i + 1} of ${round.parts}`}
            disabled={!editable}
            onClick={() => onPieceClick(i)}
            onKeyDown={(e) => onPieceKey(e, i)}
            className={cn(
              'relative grid place-items-center rounded-md shadow-[inset_0_3px_0_rgb(255_255_255/0.14),inset_0_-5px_0_rgb(0_0_0/0.16)] disabled:cursor-default',
              animate && 'transition-colors duration-150',
              round.parts > 6 ? 'min-h-[4.5rem]' : 'min-h-[6rem]',
              on ? 'bg-primary' : 'bg-[#9C6233] enabled:hover:bg-[#A96E3D]',
              showParts && 'ring-[3px] ring-inset ring-reward',
            )}
          >
            {showParts && <span className="rounded-full bg-black/25 px-2 py-0.5 font-display text-lg font-semibold text-white">{unit}</span>}
            {firstMove && i === 0 && <span className={cn('pointer-events-none absolute inset-1.5 rounded-lg ring-4 ring-reward', animate && 'animate-pulse')} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------- readout etc. */

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

/** A stacked fraction; decorative, because callers give screen readers the words. */
function StackedFraction({ top, bottom, className }: { top: ReactNode; bottom: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex flex-col items-center font-display font-semibold leading-none tabular-nums', className)} aria-hidden="true">
      {top}
      <span className="my-1 h-[3px] w-full min-w-[1.1em] rounded-full bg-current" />
      <span>{bottom}</span>
    </span>
  );
}

/** The two values that matter: what the child has shaded so far, next to the target. */
function Readout({ shaded, parts, target, correct, animate }: { shaded: number; parts: number; target: Fraction; correct: boolean; animate: boolean }) {
  return (
    <div className="flex items-center justify-center gap-5 sm:gap-8">
      <div role="group" aria-label="You made" className="text-center">
        <p className="eyebrow mb-1.5 text-primary-strong" aria-hidden="true">
          You made
        </p>
        <StackedFraction
          className="text-4xl text-primary"
          // Re-keyed on change so the new number pops in.
          top={
            <span key={animate ? shaded : undefined} className={cn(animate && 'animate-pop-in')}>
              {shaded}
            </span>
          }
          bottom={parts}
        />
        <p className="sr-only" role="status">
          {shadedWords(shaded, parts)}
        </p>
      </div>
      <span className="grid w-8 place-items-center self-stretch" aria-hidden="true">
        {correct ? <span className="font-display text-4xl font-semibold text-success">=</span> : <span className="h-full w-px bg-line" />}
      </span>
      <div role="group" aria-label="Target" className="text-center">
        <p className="eyebrow mb-1.5 flex items-center justify-center gap-1" aria-hidden="true">
          <Target className="h-3.5 w-3.5" /> Target
        </p>
        <StackedFraction className="text-4xl text-ink" top={target.numerator} bottom={target.denominator} />
        <span className="sr-only">
          {formatFraction(target)}, {fractionName(target)}
        </span>
      </div>
    </div>
  );
}

function CompleteCard({
  config,
  state,
  animate,
  headingRef,
  onRestart,
}: {
  config: FractionBuilderConfig;
  state: FractionState;
  animate: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  onRestart(): void;
}) {
  const [showRounds, setShowRounds] = useState(false);
  const listId = useId();
  const result = fractionResult(config, state);
  return (
    <div className={cn('card p-5 text-center sm:p-6', animate && 'animate-pop-in')}>
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
        <Trophy className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold focus:outline-none">
        Everything shared fairly!
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
              <StackedFraction className="text-xl text-primary" top={o.target.numerator} bottom={o.target.denominator} />
              <span className="min-w-0 flex-1 text-sm font-bold">
                Round {i + 1}: <span className="sr-only">{formatFraction(o.target)}, </span>
                {fractionName(o.target)}
              </span>
              <span className={cn('chip text-xs', o.firstTry ? 'bg-success-soft text-success-strong' : 'bg-reward-soft text-reward-strong')}>{o.firstTry ? 'First try' : `${o.wrong + 1} tries`}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
