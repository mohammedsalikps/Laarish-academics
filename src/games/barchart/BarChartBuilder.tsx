import { ArrowRight, Check, ChevronDown, Lightbulb, Minus, Plus, RotateCcw, Trophy } from 'lucide-react';
import {
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { Icon } from '../../components/ui/Icon';
import type { BarChartConfig } from '../../domain/types';
import { useSound } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { beginPointerDrag, type MiniGameProps } from '../framework';
import {
  barChartResult,
  canCheck,
  canEdit,
  createBarChartReducer,
  currentRound,
  formatValue,
  initialBarChartState,
  roundHint,
  roundOutcomes,
  snapToStep,
  tableValue,
  tickLabelEvery,
  ticks,
  topValue,
  valueAt,
  wrongChecks,
  type BarChartState,
  type BarRound,
} from './barChartLogic';

/*
 * Chart geometry in SVG units. The HTML layers on top (sliders, bar buttons) and below
 * (labels, − and +) use the same proportions, so every column lines up with its bar at any width.
 */
const VB_W = 340;
const VB_H = 224;
const PLOT = { left: 30, right: 336, top: 12, bottom: 212 };
const PLOT_W = PLOT.right - PLOT.left;
const PLOT_H = PLOT.bottom - PLOT.top;
const SNAP = 'cubic-bezier(.3,1.3,.5,1)';
const pct = (n: number) => `${+(n * 100).toFixed(4)}%`;
/** One grid column per category, inset like the plot area of the chart. */
const columnsStyle = (n: number): CSSProperties => ({
  gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
  paddingLeft: pct(PLOT.left / VB_W),
  paddingRight: pct((VB_W - PLOT.right) / VB_W),
});

/**
 * Bar Chart Builder: one chart task per round.
 *  - Build: drag each bar's top (or tap − and +) until the chart matches the table.
 *  - Read: tap the bar that answers the question.
 * Then press Check. A data nudge follows the first wrong Check, the round's hint the second.
 */
export default function BarChartBuilder({ config, reducedMotion, onEvent, onComplete, onRestart }: MiniGameProps<BarChartConfig>) {
  const reducer = useMemo(() => createBarChartReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, config, initialBarChartState);
  // The bar the learner last touched in a build round, so it resets itself on the next round.
  const [selection, setSelection] = useState<{ round: number; index: number } | null>(null);
  // Set when Check is pressed before it can be used, so the child is told why nothing happened.
  const [checkTooSoon, setCheckTooSoon] = useState(false);
  const play = useSound();
  const helpId = useId();
  const clipId = `bar-plot-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
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
      emit({ key: 'round-incorrect', vars: { hint: roundHint(r, state.checked, wrongChecks(state, r))?.text ?? r.hint } });
    } else if (state.phase === 'complete' && !reported.current) {
      reported.current = true;
      const result = barChartResult(config, state);
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

  /* ------------------------------------------------ bars: drag, keys, − and + */
  const drag = useRef<{ pointerId: number; index: number; last: number | null } | null>(null);

  if (state.phase === 'complete') {
    return <CompleteCard config={config} state={state} animate={animate} headingRef={doneRef} onRestart={onRestart} />;
  }

  const build = round.mode === 'build';
  const n = round.categories.length;
  const editable = canEdit(state);
  const checkable = canCheck(round, state);
  const correct = state.phase === 'correct';
  const top = topValue(config.step, config.max);
  const shown = build ? round.categories.map((_, i) => state.bars[i] ?? 0) : round.categories.map((_, i) => tableValue(round, i));
  const chosenIndex = round.categories.findIndex((c) => c.id === state.chosen);
  const selected = build ? (selection?.round === state.round ? selection.index : null) : chosenIndex >= 0 ? chosenIndex : null;
  const hint = correct ? null : roundHint(round, state.checked, wrongChecks(state, round));
  // The first nudge talks about the chart that was checked, so it goes once the chart changes;
  // the round's own hint stays until the round is solved.
  const visibleHint = hint && (state.phase === 'incorrect' || hint.level > 1) ? hint : null;
  const lastRound = state.round >= config.rounds.length - 1;
  const incorrect = state.phase === 'incorrect';
  const waitText = build
    ? incorrect
      ? 'Change a bar, then press Check.'
      : 'Move a bar first: drag it up, or tap +.'
    : incorrect
      ? 'Tap another bar, then press Check.'
      : 'Tap a bar first.';

  const select = (index: number) => {
    if (selection?.round !== state.round || selection.index !== index) setSelection({ round: state.round, index });
  };
  const setBar = (index: number, value: number) => {
    select(index);
    const next = snapToStep(value, config.step, config.max);
    if (!editable || next === shown[index]) return;
    dispatch({ type: 'set', index, value: next });
    setCheckTooSoon(false);
    play('tap');
  };
  const stepBar = (index: number, steps: number) => setBar(index, shown[index] + steps * config.step);

  const valueFromPointer = (e: ReactPointerEvent<HTMLElement>): number | null => {
    // Every column spans the plot from the top of the scale to the baseline.
    const r = e.currentTarget.getBoundingClientRect();
    return r.height > 0 ? valueAt((r.bottom - e.clientY) / r.height, config.step, config.max) : null;
  };
  const onBarPointerDown = (e: ReactPointerEvent<HTMLDivElement>, index: number) => {
    if (!editable || e.button !== 0) return;
    beginPointerDrag(e);
    e.currentTarget.focus({ preventScroll: true });
    const value = valueFromPointer(e);
    drag.current = { pointerId: e.pointerId, index, last: value };
    if (value === null) select(index);
    else setBar(index, value);
  };
  const onBarPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    if (e.buttons === 0) {
      drag.current = null; // released somewhere we did not hear about
      return;
    }
    const value = valueFromPointer(e);
    if (value === null || value === d.last) return;
    d.last = value;
    setBar(d.index, value);
  };
  const endDrag = () => {
    drag.current = null;
  };
  const onBarKey = (e: ReactKeyboardEvent<HTMLDivElement>, index: number) => {
    const steps: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };
    if (e.key in steps) {
      e.preventDefault();
      stepBar(index, steps[e.key]);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setBar(index, e.key === 'Home' ? 0 : top);
    }
  };

  const choose = (id: string) => {
    if (!editable) return;
    dispatch({ type: 'choose', id });
    setCheckTooSoon(false);
    play('tap');
  };

  const onMainAction = () => {
    setCheckTooSoon(!correct && !checkable);
    if (correct) dispatch({ type: 'next' });
    else if (checkable) dispatch({ type: 'check' });
  };

  // One line under the chart: the result, a hint, or why Check is not ready yet.
  let feedback: ReactNode = null;
  if (correct) {
    feedback = (
      <p className={cn('flex items-start justify-center gap-2 font-bold text-success-strong', animate && 'animate-fade-up')}>
        <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> {round.explanation}
      </p>
    );
  } else if (visibleHint) {
    feedback = (
      <p key={visibleHint.level} className={cn('flex items-start justify-center gap-2 font-bold text-ink', animate && incorrect && 'animate-fade-up')}>
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

      {/* The one play area: the table (build rounds), the live value of the chosen bar, and the chart. */}
      <div className={cn('card p-3 sm:p-6', correct && 'ring-4 ring-success/30')}>
        <div className="mx-auto w-full max-w-lg">
          {build && <DataTable round={round} selected={selected} />}
          <Readout round={round} values={shown} selected={selected} build={build} animate={animate} />

          <div className={cn('relative mt-2', incorrect && animate && 'animate-shake')}>
            <div className="relative">
              <Chart
                round={round}
                values={shown}
                step={config.step}
                max={config.max}
                selected={selected}
                correct={correct}
                firstMove={build && editable && !state.touched}
                animate={animate}
                clipId={clipId}
              />
              {build && (
                // Each column of the plot is the slider for its bar: drag (or tap) to set the height.
                <div
                  className="absolute grid"
                  style={{ ...columnsStyle(n), left: 0, right: 0, top: pct(PLOT.top / VB_H), height: pct(PLOT_H / VB_H) }}
                >
                  {round.categories.map((c, i) => (
                    <div
                      key={c.id}
                      role="slider"
                      tabIndex={editable ? 0 : -1}
                      aria-label={`${c.label} bar`}
                      aria-valuemin={0}
                      aria-valuemax={top}
                      aria-valuenow={shown[i]}
                      aria-valuetext={formatValue(shown[i])}
                      aria-disabled={!editable || undefined}
                      className={cn(
                        'touch-none select-none rounded-xl outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-0 focus-visible:outline-primary',
                        editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
                      )}
                      onPointerDown={(e) => onBarPointerDown(e, i)}
                      onPointerMove={onBarPointerMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onLostPointerCapture={endDrag}
                      onKeyDown={(e) => onBarKey(e, i)}
                      onFocus={() => select(i)}
                    />
                  ))}
                </div>
              )}
            </div>
            <Labels round={round} selected={selected} correct={correct} />
            {!build && (
              // Read rounds: each bar, with its label, is one big button.
              <div role="group" aria-label="Bars" className="absolute inset-0 grid" style={{ ...columnsStyle(n), paddingTop: pct(PLOT.top / VB_W) }}>
                {round.categories.map((c, i) => {
                  const on = state.chosen === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      aria-label={`${c.label}: ${formatValue(shown[i])}`}
                      disabled={!editable}
                      onClick={() => choose(c.id)}
                      className={cn(
                        'rounded-2xl outline-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-0 focus-visible:outline-primary disabled:cursor-default',
                        animate && 'transition-colors',
                        // The ring sits outside the column so it never covers a long label.
                        on ? (correct ? 'bg-success/10 ring-[3px] ring-success' : 'bg-reward/15 ring-[3px] ring-reward') : 'enabled:hover:bg-primary/5',
                      )}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {build && (
            <div className="mt-2 grid" style={columnsStyle(n)}>
              {round.categories.map((c, i) => (
                // Side by side when there is room; − under + when there are many bars, so 6 still fit a phone.
                <div key={c.id} className={cn('flex items-center justify-center gap-1', n > 3 ? 'flex-col-reverse' : 'flex-row')}>
                  <StepButton label={`Take ${formatValue(config.step)} from ${c.label}`} disabled={!editable || shown[i] <= 0} onClick={() => stepBar(i, -1)}>
                    <Minus className="h-5 w-5" aria-hidden="true" />
                  </StepButton>
                  <StepButton label={`Add ${formatValue(config.step)} to ${c.label}`} disabled={!editable || shown[i] >= top} onClick={() => stepBar(i, 1)}>
                    <Plus className="h-5 w-5" aria-hidden="true" />
                  </StepButton>
                </div>
              ))}
            </div>
          )}
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

/* -------------------------------------------------------------------- chart */

function Chart({
  round,
  values,
  step,
  max,
  selected,
  correct,
  firstMove,
  animate,
  clipId,
}: {
  round: BarRound;
  values: number[];
  step: number;
  max: number;
  selected: number | null;
  correct: boolean;
  firstMove: boolean;
  animate: boolean;
  clipId: string;
}) {
  const build = round.mode === 'build';
  const marks = ticks(step, max);
  const every = tickLabelEvery(step, max);
  const colW = PLOT_W / round.categories.length;
  const barW = Math.min(colW * 0.62, 48);
  const yOf = (v: number) => PLOT.bottom - (max > 0 ? v / max : 0) * PLOT_H;
  // Bars are full-height shapes slid down behind the baseline, so the rise is a transform (smooth everywhere).
  const drop = (v: number): CSSProperties => ({ transform: `translateY(${+(yOf(v) - PLOT.top).toFixed(3)}px)`, transition: animate ? `transform 160ms ${SNAP}` : 'none' });

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="block h-auto w-full select-none"
      role="img"
      aria-label={`Bar chart. The scale goes from 0 to ${formatValue(topValue(step, max))} in steps of ${formatValue(step)}.`}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={PLOT.left} y="0" width={PLOT_W} height={PLOT.bottom} />
        </clipPath>
      </defs>
      {marks.map((v, i) => (
        <g key={v}>
          <line x1={PLOT.left} x2={PLOT.right} y1={yOf(v)} y2={yOf(v)} className={v === 0 ? 'stroke-ink/60' : 'stroke-line'} strokeWidth={v === 0 ? 2.5 : 1.5} />
          {i % every === 0 && (
            <text x={PLOT.left - 6} y={yOf(v)} textAnchor="end" dominantBaseline="central" fontSize="13" fontWeight="700" className="fill-ink-soft font-display">
              {formatValue(v)}
            </text>
          )}
        </g>
      ))}
      <line x1={PLOT.left} x2={PLOT.left} y1={PLOT.top - 4} y2={PLOT.bottom} className="stroke-ink/60" strokeWidth="2.5" strokeLinecap="round" />

      <g clipPath={`url(#${clipId})`}>
        {values.map((v, i) => {
          const cx = PLOT.left + colW * (i + 0.5);
          const on = selected === i;
          // Right: every bar of a built chart goes green, but only the answer in a read round.
          const fill = correct && (build || on) ? 'fill-success' : on ? (build ? 'fill-primary-strong' : 'fill-reward') : 'fill-primary';
          return <rect key={round.categories[i].id} data-bar={i} x={cx - barW / 2} y={PLOT.top} width={barW} height={PLOT_H + 12} rx="8" className={fill} style={drop(v)} />;
        })}
      </g>

      {/* Build rounds: a handle on top of each bar, sitting on the baseline while the bar is 0. */}
      {build &&
        !correct &&
        values.map((v, i) => {
          const cx = PLOT.left + colW * (i + 0.5);
          const on = selected === i;
          return (
            <g key={round.categories[i].id} style={drop(v)} pointerEvents="none" aria-hidden="true">
              <rect
                x={cx - barW / 2 - 4}
                y={PLOT.top - 6}
                width={barW + 8}
                height="12"
                rx="6"
                strokeWidth="3"
                className={cn(on ? 'fill-reward stroke-reward-strong' : 'fill-surface stroke-primary', firstMove && i === 0 && animate && 'animate-pulse')}
              />
              <line x1={cx - 7} x2={cx + 7} y1={PLOT.top} y2={PLOT.top} strokeWidth="2" strokeLinecap="round" className={on ? 'stroke-reward-strong' : 'stroke-primary/60'} />
            </g>
          );
        })}
    </svg>
  );
}

/** Category names (and icons) under the bars, in the same columns. Decorative: sliders and buttons carry the names. */
function Labels({ round, selected, correct }: { round: BarRound; selected: number | null; correct: boolean }) {
  // When some categories have icons, the others keep an empty slot so every name sits on one line.
  const icons = round.categories.some((c) => c.icon);
  return (
    <div aria-hidden="true" className="mt-1.5 grid pb-1.5" style={columnsStyle(round.categories.length)}>
      {round.categories.map((c, i) => (
        <div
          key={c.id}
          className={cn(
            'flex min-w-0 flex-col items-center gap-0.5 px-0.5 text-center text-xs font-extrabold leading-tight sm:text-sm',
            selected === i ? (correct && round.mode === 'read' ? 'text-success-strong' : 'text-primary-strong') : 'text-ink-soft',
          )}
        >
          {c.icon ? <Icon name={c.icon} className="h-5 w-5 shrink-0" /> : icons && <span className="h-5 w-5 shrink-0" />}
          <span className="w-full hyphens-auto break-words">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Build rounds: the data to draw, with the bar being moved highlighted. */
function DataTable({ round, selected }: { round: BarRound; selected: number | null }) {
  return (
    <div className="rounded-2xl bg-canvas-sunken/70 px-3 py-2">
      <p className="eyebrow mb-1" aria-hidden="true">
        Table
      </p>
      <ul aria-label="Table" className="flex flex-wrap items-center gap-1">
        {round.categories.map((c, i) => (
          <li key={c.id} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-bold', selected === i ? 'bg-primary-soft text-primary-strong' : 'text-ink')}>
            {c.icon && <Icon name={c.icon} className="h-4 w-4 shrink-0" />}
            {c.label} <span className="font-display text-base font-semibold tabular-nums">{formatValue(tableValue(round, i))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The live value of the bar being moved (build) or chosen (read). */
function Readout({ round, values, selected, build, animate }: { round: BarRound; values: number[]; selected: number | null; build: boolean; animate: boolean }) {
  const c = selected === null ? null : round.categories[selected];
  return (
    <p role="status" className="mt-2 flex min-h-[2.25rem] items-center justify-center gap-2 text-center font-display text-xl font-semibold text-ink">
      {c && selected !== null ? (
        <>
          {c.icon && <Icon name={c.icon} className="h-6 w-6 shrink-0 text-primary" />}
          <span>{c.label}:</span>{' '}
          <span key={animate ? `${selected}-${values[selected]}` : undefined} className={cn('min-w-[2ch] rounded-lg bg-primary-soft px-2 tabular-nums text-primary-strong', animate && 'animate-pop-in')}>
            {formatValue(values[selected])}
          </span>
        </>
      ) : (
        <span className="font-sans text-base font-bold text-ink-muted">{build ? 'Drag a bar up, or tap + and −.' : 'Tap a bar to choose it.'}</span>
      )}
    </p>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      // aria-disabled, not disabled: a button that reaches the end of the scale keeps keyboard focus.
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-line bg-surface text-primary-strong shadow-press-line active:translate-y-px aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:active:translate-y-0"
    >
      {children}
    </button>
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

function CompleteCard({
  config,
  state,
  animate,
  headingRef,
  onRestart,
}: {
  config: BarChartConfig;
  state: BarChartState;
  animate: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  onRestart(): void;
}) {
  const [showRounds, setShowRounds] = useState(false);
  const listId = useId();
  const result = barChartResult(config, state);
  return (
    <div className={cn('card p-5 text-center sm:p-6', animate && 'animate-pop-in')}>
      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
        <Trophy className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold focus:outline-none">
        Every chart is done!
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
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-extrabold">
                  Round {i + 1}: {o.mode === 'build' ? 'Build' : 'Read'}
                </span>
                <span className="block text-ink-soft">{o.prompt}</span>
              </span>
              <span className={cn('chip shrink-0 text-xs', o.firstTry ? 'bg-success-soft text-success-strong' : 'bg-reward-soft text-reward-strong')}>{o.firstTry ? 'First try' : `${o.wrong + 1} tries`}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
