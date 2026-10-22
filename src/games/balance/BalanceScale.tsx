import { ArrowRight, Check, Lightbulb, RotateCcw, Trophy } from 'lucide-react';
import { useEffect, useId, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { BalanceGameConfig, BalanceTerm } from '../../domain/types';
import { useSound } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import type { MiniGameProps } from '../framework';
import { balanceHint, balanceResult, createBalanceReducer, initialBalanceState, sideTotal, tilt, wrongTries } from './balanceLogic';

const PIVOT = { x: 180, y: 64 };
const ARM = 118;
const MAX_TILT_DEG = 9;
const SWING = 'transform 550ms cubic-bezier(.3,1.4,.5,1)';

function sideLabel(terms: BalanceTerm[], unknownLabel: string, chosen: number | null): string {
  return terms.map((t) => (t === 'unknown' ? (chosen === null ? unknownLabel : String(chosen)) : String(t))).join(' + ');
}

function Pan({ x, y, label, highlight, animate }: { x: number; y: number; label: string; highlight: boolean; animate: boolean }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)`, transition: animate ? SWING : 'none' }}>
      <line x1="0" y1="0" x2="-44" y2="58" stroke="#8B8FA8" strokeWidth="2.5" />
      <line x1="0" y1="0" x2="44" y2="58" stroke="#8B8FA8" strokeWidth="2.5" />
      <rect x={-Math.max(36, label.length * 7.5)} y="22" width={Math.max(72, label.length * 15)} height="30" rx="10" fill={highlight ? '#ECE9FF' : '#FFFFFF'} stroke={highlight ? '#5847E0' : '#D9DBE8'} strokeWidth="2" />
      <text x="0" y="43" textAnchor="middle" className="fill-ink font-display" fontSize="18" fontWeight="700">
        {label}
      </text>
      <path d="M -60 58 Q 0 84 60 58 Z" fill="#F2A516" stroke="#C98500" strokeWidth="2" />
    </g>
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

/**
 * Balance Scale: find the number that makes both sides of the scale equal.
 * One scale at a time: tap a number, watch the scale tip, press Check.
 */
export default function BalanceScale({ config, reducedMotion, onEvent, onComplete, onRestart }: MiniGameProps<BalanceGameConfig>) {
  const reducer = useMemo(() => createBalanceReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, initialBalanceState);
  // Set when Check is pressed before it can be used, so the child is told why nothing happened.
  const [checkTooSoon, setCheckTooSoon] = useState(false);
  const play = useSound();
  const helpId = useId();
  const round = config.rounds[Math.min(state.round, config.rounds.length - 1)];
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
    const current = config.rounds[state.round];
    if (state.phase === 'correct') {
      play('correct');
      // Same variables as the other round games, so coach lines can use {explanation} and {hint}.
      callbacks.current.onEvent({ key: 'round-correct', vars: { explanation: current?.explanation ?? '' } });
    } else if (state.phase === 'incorrect') {
      play('incorrect');
      const hint = current ? (balanceHint(current, state.chosen, wrongTries(state, current))?.text ?? current.hint) : '';
      callbacks.current.onEvent({ key: 'round-incorrect', vars: { hint } });
    } else if (state.phase === 'complete' && !reported.current) {
      reported.current = true;
      const result = balanceResult(config, state);
      play('reward');
      callbacks.current.onEvent({ key: result.perfect ? 'complete:perfect' : 'complete' });
      callbacks.current.onComplete(result);
    }
  }, [state, config, play]);

  // Keyboard and screen-reader focus follows the game: each new scale's task, then the summary.
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

  if (state.phase === 'complete') {
    const result = balanceResult(config, state);
    return (
      <div className={cn('card p-6 text-center', animate && 'animate-pop-in')}>
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
          <Trophy className="h-8 w-8" aria-hidden="true" />
        </div>
        <h3 ref={doneRef} tabIndex={-1} className="font-display text-2xl font-semibold focus:outline-none">
          Every scale is balanced!
        </h3>
        <p className="mt-1 text-ink-soft">
          {result.correct} of {result.total} balanced on the first try{result.perfect ? '. Perfect!' : '.'}
        </p>
        <button type="button" className="btn btn-secondary mt-5" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Play again
        </button>
      </div>
    );
  }

  const t = tilt(round, state.chosen);
  const angle = ((t ?? 0) * MAX_TILT_DEG * Math.PI) / 180;
  const left = { x: PIVOT.x - ARM * Math.cos(angle), y: PIVOT.y - ARM * Math.sin(angle) };
  const right = { x: PIVOT.x + ARM * Math.cos(angle), y: PIVOT.y + ARM * Math.sin(angle) };
  const leftLabel = sideLabel(round.left, config.unknownLabel, state.chosen);
  const rightLabel = sideLabel(round.right, config.unknownLabel, state.chosen);
  const leftTotal = sideTotal(round.left, state.chosen);
  const rightTotal = sideTotal(round.right, state.chosen);
  const correct = state.phase === 'correct';
  const checkable = state.phase === 'playing' && state.chosen !== null;
  const tiltText = t === null ? 'waiting for a number' : t === 0 ? 'level: both sides are equal' : t < 0 ? 'tipped down on the left: the left side is heavier' : 'tipped down on the right: the right side is heavier';
  const hint = correct ? null : balanceHint(round, state.chosen, wrongTries(state, round));
  // The first nudge is about the number just checked, so it goes once another number is tried;
  // the round's own hint stays until the scale is balanced.
  const visibleHint = hint && (state.phase === 'incorrect' || hint.level > 1) ? hint : null;
  const lastRound = state.round >= config.rounds.length - 1;
  const waitText = state.phase === 'incorrect' ? 'Tap another number, then press Check.' : 'Tap a number first.';

  const choose = (value: number) => {
    dispatch({ type: 'choose', value });
    setCheckTooSoon(false);
    play('tap');
  };
  const onMainAction = () => {
    setCheckTooSoon(!correct && !checkable);
    if (correct) dispatch({ type: 'next' });
    else if (checkable) dispatch({ type: 'check' });
  };

  // One line under the scale: the result, a hint, or why Check is not ready yet.
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
        <h3 ref={headingRef} tabIndex={-1} className="min-w-0 font-display text-xl font-semibold leading-snug focus:outline-none sm:text-2xl">
          <span className="sr-only">
            Round {state.round + 1} of {config.rounds.length}:
          </span>{' '}
          {round.prompt}
        </h3>
        <RoundDots total={config.rounds.length} current={state.round} currentDone={correct} />
      </div>

      {/* The one play area: the scale, both totals, and the numbers to try. */}
      <div className={cn('card grid place-items-center gap-3 p-4 sm:p-6', correct && 'ring-4 ring-success/30')}>
        <svg viewBox="0 0 360 230" className="h-auto w-full max-w-md" role="img" aria-label={`Balance scale. Left side: ${leftLabel}. Right side: ${rightLabel}. The scale is ${tiltText}.`}>
          <path d="M 150 222 L 210 222 L 192 200 L 168 200 Z" fill="#6B6F8C" />
          <rect x="174" y={PIVOT.y} width="12" height="140" rx="6" fill="#8B8FA8" />
          <g style={{ transform: `rotate(${(t ?? 0) * MAX_TILT_DEG}deg)`, transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`, transition: animate ? SWING : 'none' }}>
            <rect x={PIVOT.x - ARM - 6} y={PIVOT.y - 5} width={ARM * 2 + 12} height="10" rx="5" fill="#5847E0" />
          </g>
          <circle cx={PIVOT.x} cy={PIVOT.y} r="11" fill="#F2A516" stroke="#fff" strokeWidth="3" />
          <Pan x={left.x} y={left.y} label={leftLabel} highlight={round.left.includes('unknown')} animate={animate} />
          <Pan x={right.x} y={right.y} label={rightLabel} highlight={round.right.includes('unknown')} animate={animate} />
        </svg>

        <div aria-live="polite" className="text-center font-display text-lg font-semibold">
          <p aria-hidden="true">
            Left {leftTotal ?? '?'}{' '}
            <span className={cn('mx-1 inline-block min-w-[1.75rem] rounded-lg px-1.5', t === null ? 'bg-canvas-sunken text-ink-muted' : t === 0 ? 'bg-success-soft text-success-strong' : 'bg-coral-soft text-coral-strong')}>
              {t === null ? '?' : t === 0 ? '=' : t < 0 ? '>' : '<'}
            </span>{' '}
            Right {rightTotal ?? '?'}
          </p>
          <p className="sr-only">{leftTotal === null || rightTotal === null ? `Try a number for ${config.unknownLabel}.` : `Left ${leftTotal}, right ${rightTotal}. The scale is ${tiltText}.`}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label={`Numbers to try for ${config.unknownLabel}`}>
          <span className="mr-1 font-display text-2xl font-semibold text-primary-strong" aria-hidden="true">
            {config.unknownLabel} =
          </span>
          {round.choices.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={state.chosen === value}
              disabled={correct}
              onClick={() => choose(value)}
              className={cn(
                'grid h-14 min-w-[3.5rem] place-items-center rounded-2xl border-2 px-3 font-display text-2xl font-semibold disabled:cursor-default',
                animate && 'transition-colors',
                state.chosen === value ? 'border-primary bg-primary text-white shadow-soft' : 'border-line bg-surface enabled:hover:border-primary/50',
              )}
            >
              {value}
            </button>
          ))}
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
