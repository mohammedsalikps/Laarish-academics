import { ArrowRight, Check, ChevronDown, Lightbulb, RotateCcw, Trophy } from 'lucide-react';
import { useEffect, useId, useMemo, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from 'react';
import type { ClockConfig } from '../../domain/types';
import { useSound } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { beginPointerDrag, type MiniGameProps } from '../framework';
import {
  HALF_DAY,
  canCheck,
  canMove,
  clockResult,
  createClockReducer,
  currentRound,
  followFinger,
  formatTime,
  handTurns,
  initialClockState,
  pointAngle,
  roundHint,
  roundOutcomes,
  snapTime,
  timeWords,
  wrapTime,
  wrongChecks,
  type ClockState,
} from './clockLogic';

/* Clock face geometry, in SVG units (the face is drawn about 240 px wide). */
const C = 120;
const FACE_R = 114;
const NUMBER_R = 84;
const MINUTE_LEN = 88;
const HOUR_LEN = 54;
const HAND_EASE = 'transform 220ms cubic-bezier(.3,1.3,.5,1)';
/** Amber ring on the minute hand's knob until the first move: "drag me". */
const CUE = '#F2A516';

/** A point on the face at a radius and an angle clockwise from 12. */
function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)];
}

/**
 * Clock Setter: show a time on an analogue clock. One time per round: drag the
 * long (minute) hand round the face, or use the step buttons or arrow keys;
 * the short hand follows the minutes like a real clock. The digital readout
 * underneath shows the time the clock says. One Check / Next button.
 */
export default function ClockSetter({ config, reducedMotion, onEvent, onComplete, onRestart }: MiniGameProps<ClockConfig>) {
  const reducer = useMemo(() => createClockReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, config, initialClockState);
  // Set when Check is pressed before it can be used, so the child is told why nothing happened.
  const [checkTooSoon, setCheckTooSoon] = useState(false);
  const [dragging, setDragging] = useState(false);
  const play = useSound();
  const helpId = useId();
  const keysId = useId();
  const round = currentRound(config, state);
  const step = config.minuteStep;
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
      const result = clockResult(config, state);
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

  // The drag in progress: the unsnapped time under the finger, and the snapped time last sent.
  const drag = useRef<{ pointerId: number; time: number; shown: number } | null>(null);

  if (state.phase === 'complete') {
    return <CompleteCard config={config} state={state} animate={animate} headingRef={doneRef} onRestart={onRestart} />;
  }

  const editable = canMove(state);
  const checkable = canCheck(state);
  const correct = state.phase === 'correct';
  const firstMove = !state.started && editable;
  const hint = correct ? null : roundHint(round, state.lastWrong, wrongChecks(state, round));
  // The nudge talks about the time that was checked, so it goes once the hands move;
  // the round's own hint stays until the clock is right.
  const visibleHint = hint && (state.phase === 'incorrect' || hint.level > 1) ? hint : null;
  const lastRound = state.round >= config.rounds.length - 1;
  const waitText = state.phase === 'incorrect' ? 'Move the hands, then press Check.' : 'Move the clock hands first.';
  const words = step >= 15 ? timeWords(state.time) : null;

  const shift = (minutes: number) => {
    if (!editable) return;
    dispatch({ type: 'shift', minutes });
    setCheckTooSoon(false);
    play('tap');
  };

  const onMainAction = () => {
    setCheckTooSoon(!correct && !checkable);
    if (correct) dispatch({ type: 'next' });
    else if (checkable) dispatch({ type: 'check' });
  };

  /* ---------------------------------------------- dragging the minute hand */
  const angleAt = (e: ReactPointerEvent<HTMLElement>): number | null => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    // Too close to the centre to tell which way the finger points.
    if (Math.hypot(dx, dy) < Math.min(r.width, r.height) * 0.08) return null;
    return pointAngle(dx, dy);
  };
  const follow = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    const angle = angleAt(e);
    if (!d || angle === null) return;
    d.time = followFinger(d.time, angle);
    const snapped = snapTime(d.time, step);
    if (snapped === d.shown) return;
    d.shown = snapped;
    dispatch({ type: 'set', time: snapped });
    setCheckTooSoon(false);
    play('tap');
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable || e.button > 0) return;
    beginPointerDrag(e);
    // The hand jumps the short way to the finger, then follows it round.
    drag.current = { pointerId: e.pointerId, time: state.time, shown: state.time };
    setDragging(true);
    follow(e);
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    if (e.buttons === 0) {
      endDrag(); // released somewhere we did not hear about
      return;
    }
    follow(e);
  };

  const onSliderKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onMainAction();
      return;
    }
    const moves: Partial<Record<string, number>> = { ArrowRight: step, ArrowLeft: -step, ArrowUp: 60, ArrowDown: -60, PageUp: 60, PageDown: -60 };
    const minutes = moves[e.key];
    if (minutes === undefined) return;
    e.preventDefault();
    shift(minutes);
  };

  // One line under the clock: the result, a hint, or why Check is not ready yet.
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

      {/* The one play area: the clock, what it says, and the step buttons. */}
      <div className={cn('card p-4 sm:p-6', correct && 'ring-4 ring-success/30')}>
        <div
          role="slider"
          tabIndex={editable ? 0 : -1}
          aria-label="Minute hand"
          aria-valuemin={0}
          aria-valuemax={HALF_DAY - step}
          aria-valuenow={wrapTime(state.time)}
          aria-valuetext={formatTime(state.time)}
          aria-disabled={!editable || undefined}
          aria-describedby={keysId}
          onKeyDown={onSliderKey}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          className={cn(
            'relative mx-auto aspect-square w-full max-w-[15rem] touch-none select-none rounded-full focus-visible:rounded-full',
            editable ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
            state.phase === 'incorrect' && animate && 'animate-shake',
          )}
        >
          <ClockFace key={state.round} time={state.time} firstMove={firstMove} animate={animate && !dragging} pulse={animate} />
        </div>
        <span id={keysId} className="sr-only">
          Left and right arrows move the minutes. Up and down arrows move the hour. Enter checks.
        </span>

        <div role="status" className="mt-3 text-center">
          <p className="font-display text-4xl font-semibold tabular-nums text-ink">{formatTime(state.time)}</p>
          {words && <p className="mt-0.5 font-bold text-ink-soft">{words}</p>}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
          {step < 60 && (
            <div role="group" aria-label="Minutes" className="flex gap-2">
              <StepButton label={`− ${step} min`} disabled={!editable} onClick={() => shift(-step)} />
              <StepButton label={`+ ${step} min`} disabled={!editable} onClick={() => shift(step)} />
            </div>
          )}
          <div role="group" aria-label="Hours" className="flex gap-2">
            <StepButton label="− 1 hour" disabled={!editable} onClick={() => shift(-60)} />
            <StepButton label="+ 1 hour" disabled={!editable} onClick={() => shift(60)} />
          </div>
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

/* --------------------------------------------------------------- the clock */

/** The face, numbers, minute ticks and both hands. Decorative: the slider around it carries the time. */
function ClockFace({ time, firstMove, animate, pulse }: { time: number; firstMove: boolean; animate: boolean; pulse: boolean }) {
  const turns = handTurns(time);
  const ease = animate ? HAND_EASE : 'none';
  const tip = C - MINUTE_LEN;
  return (
    <svg viewBox="0 0 240 240" className="block h-full w-full" aria-hidden="true">
      <circle cx={C} cy={C} r={FACE_R} className="fill-surface stroke-ink" strokeWidth="4" />
      {Array.from({ length: 60 }, (_, i) => {
        const five = i % 5 === 0;
        const [x1, y1] = polar(five ? 97 : 103, i * 6);
        const [x2, y2] = polar(108, i * 6);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={five ? 'stroke-ink' : 'stroke-ink/40'} strokeWidth={five ? 3 : 1.5} strokeLinecap="round" />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const [x, y] = polar(NUMBER_R, n * 30);
        return (
          <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-ink font-display" fontSize="20" fontWeight="600">
            {n}
          </text>
        );
      })}
      <g data-hand="hour" style={{ transform: `rotate(${turns.hour}deg)`, transformOrigin: `${C}px ${C}px`, transition: ease }}>
        <line x1={C} y1={C + 12} x2={C} y2={C - HOUR_LEN} className="stroke-ink" strokeWidth="10" strokeLinecap="round" />
      </g>
      <g data-hand="minute" style={{ transform: `rotate(${turns.minute}deg)`, transformOrigin: `${C}px ${C}px`, transition: ease }}>
        <line x1={C} y1={C + 16} x2={C} y2={tip} className="stroke-primary" strokeWidth="6" strokeLinecap="round" />
        <circle cx={C} cy={tip} r="8" className="fill-primary stroke-surface" strokeWidth="3" />
        {firstMove && <circle cx={C} cy={tip} r="15" fill="none" stroke={CUE} strokeWidth="4" className={cn(pulse && 'animate-pulse')} />}
      </g>
      <circle cx={C} cy={C} r="8" className="fill-ink" />
      <circle cx={C} cy={C} r="3" className="fill-primary" />
    </svg>
  );
}

function StepButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick(): void }) {
  return (
    <button type="button" className="btn btn-secondary min-w-[6rem] px-3 tabular-nums" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

/* ---------------------------------------------------------- progress etc. */

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
  config: ClockConfig;
  state: ClockState;
  animate: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  onRestart(): void;
}) {
  const [showRounds, setShowRounds] = useState(false);
  const listId = useId();
  const result = clockResult(config, state);
  return (
    <div className={cn('card p-5 text-center sm:p-6', animate && 'animate-pop-in')}>
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
        <Trophy className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold focus:outline-none">
        Every clock is set!
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
              <span className="font-display text-xl font-semibold tabular-nums text-primary">{o.time}</span>
              <span className="min-w-0 flex-1 text-sm font-bold">
                Round {i + 1}
                {o.words && <span className="font-semibold text-ink-soft">: {o.words}</span>}
              </span>
              <span className={cn('chip text-xs', o.firstTry ? 'bg-success-soft text-success-strong' : 'bg-reward-soft text-reward-strong')}>{o.firstTry ? 'First try' : `${o.wrong + 1} tries`}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
