import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronDown, Footprints, Hand, Lightbulb, Map as MapIcon, MapPin, RotateCcw, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useMemo, useReducer, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type Ref } from 'react';
import { Avatar } from '../../components/art/Avatar';
import { Icon } from '../../components/ui/Icon';
import { useSound } from '../../hooks/usePreferences';
import type { GridExplorerConfig } from '../../domain/types';
import { cn } from '../../lib/cn';
import { useProgress } from '../../state/ProgressProvider';
import type { MiniGameProps } from '../framework';
import {
  cellKey,
  cellLabel,
  createGridReducer,
  createGridState,
  describeLegs,
  describeWalk,
  DIRECTION_NAMES,
  directionBetween,
  edgeMessage,
  foundMessage,
  gridResult,
  landmarkAt,
  legsOf,
  notYetMessage,
  onMap,
  pathCells,
  reachableCells,
  sameCell,
  stepFrom,
  straightLineTip,
  straightPath,
  trailSteps,
  whereIs,
  type Cell,
  type Direction,
  type GridState,
} from './gridLogic';

const KEY_DIRECTIONS: Record<string, Direction> = { ArrowUp: 'north', ArrowDown: 'south', ArrowRight: 'east', ArrowLeft: 'west' };
const ARROWS: Record<Direction, LucideIcon> = { north: ArrowUp, south: ArrowDown, east: ArrowRight, west: ArrowLeft };
/** Where each compass button sits in the 3x3 pad. */
const PAD_PLACE: Record<Direction, string> = { north: 'col-start-2 row-start-1', west: 'col-start-1 row-start-2', east: 'col-start-3 row-start-2', south: 'col-start-2 row-start-3' };
/** Footprint rotation in degrees; the footprint glyph points North. */
const ROTATION: Record<Direction, number> = { north: 0, east: 90, south: 180, west: 270 };
/** Time per square when walking to a tapped square. */
const STEP_MS = 180;
const FIRST_TIP = 'Tap a glowing square to walk there.';

type Feedback = {
  id: number;
  tone: 'info' | 'walk' | 'tip' | 'found';
  text: string;
  direction?: Direction;
  /** Squares to try first after a tap that was not in a straight line. */
  via?: Cell[];
};

const TONE_STYLE: Record<Feedback['tone'], string> = {
  info: 'bg-canvas-sunken text-ink-soft',
  walk: 'bg-primary-soft text-primary-strong',
  tip: 'bg-reward-soft text-ink',
  found: 'bg-success-soft text-success-strong',
};

/** Treasure Trail: walk the map using North, South, East and West. */
export default function GridExplorer({ config, reducedMotion, onEvent, onComplete, onRestart }: MiniGameProps<GridExplorerConfig>) {
  const reducer = useMemo(() => createGridReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, config, createGridState);
  const [feedback, setFeedback] = useState<Feedback>({ id: 0, tone: 'info', text: FIRST_TIP });
  const [walking, setWalking] = useState(false);
  const [hover, setHover] = useState<Cell | null>(null);
  const [showKey, setShowKey] = useState(false);
  const play = useSound();
  const helpId = useId();
  const keyId = useId();
  const { state: progress } = useProgress();
  const avatarId = progress.learner?.avatarId ?? 'fox';
  const task = config.tasks[Math.min(state.task, config.tasks.length - 1)];
  const target = config.landmarks.find((l) => l.id === task.targetId)!;

  const gridRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const walkTimer = useRef<number | undefined>(undefined);
  const focusExplorer = useRef(false);
  const callbacks = useRef({ onEvent, onComplete });
  useEffect(() => {
    callbacks.current = { onEvent, onComplete };
  }, [onEvent, onComplete]);

  useEffect(() => {
    callbacks.current.onEvent({ key: 'start' });
    const timer = walkTimer;
    return () => window.clearTimeout(timer.current);
  }, []);

  // Keyboard walking, retries and new stops keep focus on the explorer's square.
  useEffect(() => {
    if (!focusExplorer.current) return;
    focusExplorer.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>('[data-explorer]')?.focus();
  });

  const lastPhase = useRef(state.phase);
  const completedOnce = useRef(false);
  useEffect(() => {
    if (state.phase === lastPhase.current) return;
    lastPhase.current = state.phase;
    const { onEvent: emit, onComplete: complete } = callbacks.current;
    if (state.phase === 'correct') {
      play('correct');
      emit({ key: 'task-correct', vars: { place: target.label.toLowerCase() } });
      nextRef.current?.focus();
    } else if (state.phase === 'incorrect') {
      play('incorrect');
      emit({ key: 'task-incorrect', vars: { hint: whereIs(target.label, state.pos, target.at) } });
    } else if (state.phase === 'complete' && !completedOnce.current) {
      completedOnce.current = true;
      const result = gridResult(config, state);
      play('reward');
      emit({ key: result.perfect ? 'complete:perfect' : 'complete' });
      complete(result);
      doneRef.current?.focus();
    }
  }, [state, config, play, target]);

  if (state.phase === 'complete') return <TrailComplete config={config} state={state} headingRef={doneRef} onRestart={onRestart} />;

  const busy = walking || state.phase === 'correct';
  const say = (f: Omit<Feedback, 'id'>) => setFeedback((prev) => ({ ...f, id: prev.id + 1 }));

  const walked = (steps: Direction[], end: Cell) => {
    say({ tone: 'walk', text: describeWalk(steps, landmarkAt(config, end)?.label), direction: steps[0] });
    onEvent({ key: `walk:${steps[0]}`, vars: { steps: String(steps.length) } });
  };

  /** One step with a compass button or arrow key. */
  const move = (direction: Direction) => {
    if (busy) return;
    const next = stepFrom(state.pos, direction);
    if (!onMap(config, next)) {
      say({ tone: 'tip', text: edgeMessage(direction) });
      return;
    }
    dispatch({ type: 'move', direction });
    play('tap');
    walked([direction], next);
  };

  /** Tap a square: walk there in a straight line, one square at a time. */
  const walkTo = (cell: Cell) => {
    if (busy) return;
    const path = straightPath(state.pos, cell);
    if (!path) {
      const tip = straightLineTip(state.pos, cell);
      say({ tone: 'tip', text: tip.text, via: tip.via });
      return;
    }
    if (!path.length) {
      say({ tone: 'info', text: `You are here. ${FIRST_TIP}` });
      return;
    }
    setHover(null);
    if (reducedMotion || path.length === 1) {
      dispatch({ type: 'walk-to', to: cell });
      play('tap');
      walked(path, cell);
      return;
    }
    setWalking(true);
    let i = 0;
    const tick = () => {
      dispatch({ type: 'move', direction: path[i] });
      play('tap');
      i += 1;
      if (i < path.length) {
        walkTimer.current = window.setTimeout(tick, STEP_MS);
      } else {
        setWalking(false);
        walked(path, cell);
      }
    };
    tick();
  };

  const arrive = () => {
    if (walking) return;
    if (state.phase === 'incorrect') {
      say({ tone: 'tip', text: 'Walk to a new square first.' });
      return;
    }
    if (state.phase !== 'playing') return;
    const found = landmarkAt(config, state.pos)?.id === task.targetId;
    say(
      found
        ? { tone: 'found', text: foundMessage(target.label, state.taskStart, target.at, state.stopSteps) }
        : { tone: 'tip', text: notYetMessage(target.label, state.pos, target.at) },
    );
    dispatch({ type: 'arrive' });
  };

  const retry = () => {
    dispatch({ type: 'retry' });
    play('tap');
    focusExplorer.current = true;
    say({ tone: 'info', text: 'Back to the start of this stop.' });
  };

  const goNext = () => {
    const nextTask = config.tasks[state.task + 1];
    dispatch({ type: 'next' });
    play('tap');
    if (!nextTask) return;
    focusExplorer.current = true;
    say({ tone: 'info', text: `Stop ${state.task + 2}: ${nextTask.prompt}` });
  };

  const onGridKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = KEY_DIRECTIONS[e.key];
    if (dir) {
      e.preventDefault();
      focusExplorer.current = true;
      move(dir);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      arrive();
    }
  };

  const onCellPointerEnter = (cell: Cell) => (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') setHover((h) => (h && sameCell(h, cell) ? h : cell));
  };

  const firstMove = state.steps === 0 && !walking;
  const mistakesHere = state.mistakesByTask[task.id] ?? 0;
  const here = landmarkAt(config, state.pos);
  const reachable = new Set(busy ? [] : reachableCells(config, state.pos).map(cellKey));
  const hoverPath = hover && !busy ? straightPath(state.pos, hover) : null;
  const preview = new Set(hoverPath ? pathCells(state.pos, hoverPath).map(cellKey) : []);
  const via = new Set(feedback.via?.map(cellKey) ?? []);
  const isLast = state.task >= config.tasks.length - 1;
  const [col, row] = state.pos;
  const FeedbackIcon =
    feedback.tone === 'walk' && feedback.direction ? ARROWS[feedback.direction] : feedback.tone === 'found' ? Check : feedback.tone === 'tip' ? Lightbulb : firstMove ? Hand : Footprints;

  return (
    <div className="mx-auto max-w-[560px] space-y-3 lg:max-w-none">
      {/* ------------------------------------------- current stop + progress */}
      <section className="rounded-3xl bg-primary-soft p-3 sm:p-4" aria-label={`Stop ${state.task + 1} of ${config.tasks.length}`}>
        <div className="flex items-center justify-between gap-3">
          <ol className="flex gap-1.5" aria-label="Trail progress">
            {config.tasks.map((t, i) => {
              const found = i < state.task || (i === state.task && state.phase === 'correct');
              return (
                <li key={t.id} className={cn('h-2.5 w-6 rounded-full transition-colors', found ? 'bg-success' : i === state.task ? 'bg-primary' : 'bg-ink/10')}>
                  <span className="sr-only">{found ? `Stop ${i + 1} found` : `Stop ${i + 1}`}</span>
                </li>
              );
            })}
          </ol>
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-primary-strong">
            <Footprints className="h-4 w-4" aria-hidden="true" />
            {state.stopSteps} {state.stopSteps === 1 ? 'step' : 'steps'}
            <span className="sr-only"> walked</span>
          </p>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface text-primary shadow-soft">
            <Icon name={target.icon} width={24} height={24} />
          </span>
          <h3 className="min-w-0 font-display text-lg font-semibold leading-snug sm:text-xl">{task.prompt}</h3>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start lg:gap-4">
        {/* -------------------------------------------------------------- map */}
        <div className="relative mx-auto w-full max-w-[520px] rounded-3xl border border-line bg-[#EAF6E8] p-6 sm:p-7">
          <span className="absolute left-1/2 top-1 -translate-x-1/2 font-display text-sm font-semibold text-coral-strong sm:top-1.5" aria-hidden="true">
            N
          </span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 font-display text-sm font-semibold text-ink-muted sm:bottom-1.5" aria-hidden="true">
            S
          </span>
          <span className="absolute left-2 top-1/2 -translate-y-1/2 font-display text-sm font-semibold text-ink-muted" aria-hidden="true">
            W
          </span>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 font-display text-sm font-semibold text-ink-muted" aria-hidden="true">
            E
          </span>
          <p id={helpId} className="sr-only">
            North is at the top. Choose a square in your row or column to walk there, or use the arrow keys to walk one step. Press Enter when you reach the right place.
          </p>
          <div className="relative">
            <div ref={gridRef} role="grid" aria-label="Treasure map" aria-describedby={helpId} onKeyDown={onGridKeyDown} onPointerLeave={() => setHover(null)}>
              {Array.from({ length: config.size }, (_, r) => (
                <div key={r} role="row" className="grid" style={{ gridTemplateColumns: `repeat(${config.size}, minmax(0, 1fr))` }}>
                  {Array.from({ length: config.size }, (_, c) => {
                    const cell: Cell = [c, r];
                    const key = cellKey(cell);
                    const landmark = landmarkAt(config, cell);
                    const isHere = c === col && r === row;
                    const showTarget = mistakesHere >= 2 && landmark?.id === target.id && state.phase !== 'correct';
                    return (
                      <div key={key} role="gridcell" className="p-[3px]">
                        <button
                          type="button"
                          tabIndex={isHere ? 0 : -1}
                          data-explorer={isHere || undefined}
                          aria-label={cellLabel(config, cell, state.pos)}
                          onClick={() => walkTo(cell)}
                          onPointerEnter={onCellPointerEnter(cell)}
                          className={cn(
                            'relative grid aspect-square w-full place-items-center rounded-xl border-2 text-center transition-colors duration-150 focus-visible:[outline-offset:-2px]',
                            isHere
                              ? 'border-primary/50 bg-[#E3F4DE]'
                              : preview.has(key)
                                ? 'border-primary/40 bg-primary-soft'
                                : via.has(key)
                                  ? 'border-reward bg-reward-soft'
                                  : reachable.has(key)
                                    ? 'border-white bg-[#F3FBF1] hover:border-primary/40'
                                    : 'border-transparent bg-[#CBE8C4]',
                            busy ? 'cursor-default' : 'cursor-pointer',
                            showTarget && 'ring-4 ring-reward/70 motion-safe:animate-pulse',
                          )}
                        >
                          {landmark && (
                            <span className="flex flex-col items-center gap-0.5 font-extrabold leading-tight text-ink" aria-hidden="true">
                              <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface text-primary shadow-soft sm:h-9 sm:w-9">
                                <Icon name={landmark.icon} width={18} height={18} />
                              </span>
                              <span className="hidden px-0.5 text-[0.7rem] sm:block">{landmark.label}</span>
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <FootprintTrail trail={state.trail} size={config.size} />
            {/* the explorer glides between squares (instantly with reduced motion) */}
            <div
              className={cn('pointer-events-none absolute left-0 top-0 grid place-items-center', !reducedMotion && 'transition-transform duration-150 ease-out')}
              style={{ width: `${100 / config.size}%`, height: `${100 / config.size}%`, transform: `translate(${col * 100}%, ${row * 100}%)` }}
              aria-hidden="true"
            >
              <span
                className={cn(
                  'grid place-items-center rounded-full',
                  !reducedMotion && 'transition-all duration-150',
                  here ? 'h-[44%] w-[44%] -translate-y-[58%] translate-x-[58%]' : 'h-[66%] w-[66%]',
                  firstMove && 'motion-safe:animate-pulse-ring',
                )}
              >
                <Avatar id={avatarId} size={40} className="h-full w-full shadow-lift ring-2 ring-surface" />
              </span>
              {firstMove && (
                <span
                  className={cn(
                    'absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-white shadow-soft',
                    row === 0 ? 'bottom-0 translate-y-1/2' : 'top-0 -translate-y-1/2',
                  )}
                >
                  Start here
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* ------------------------------------- one sentence after each action */}
          <div aria-live="polite" className={cn('min-h-[3.25rem] rounded-2xl px-3.5 py-2.5', TONE_STYLE[feedback.tone])}>
            <p key={feedback.id} className="flex items-start gap-2 font-bold leading-snug motion-safe:animate-fade-in">
              <FeedbackIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              {feedback.text}
            </p>
            {/* hints only after a wrong "I am here!" */}
            {mistakesHere > 0 && state.phase !== 'correct' && (
              <p className="mt-1.5 flex items-start gap-1.5 text-sm font-bold text-ink-soft">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-reward-strong" aria-hidden="true" />
                {task.hint}
              </p>
            )}
          </div>

          {/* ------------------------------------------------ controls */}
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {state.phase === 'correct' ? (
                <button ref={nextRef} type="button" className="btn btn-primary btn-lg w-full !px-4" onClick={goNext}>
                  {isLast ? 'Finish' : 'Next stop'} <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" className="btn btn-success btn-lg w-full !px-4" onClick={arrive}>
                  <MapPin className="h-5 w-5" aria-hidden="true" /> I am here!
                </button>
              )}
              <button type="button" className="btn btn-ghost btn-sm !min-h-[44px] self-center" onClick={retry} disabled={busy || state.stopSteps === 0}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Start again
              </button>
            </div>
            <CompassPad onMove={move} disabled={state.phase === 'correct'} />
          </div>

          {/* map key: square names are shown on the map from the sm breakpoint */}
          <div className="sm:hidden">
            <button type="button" className="btn btn-ghost btn-sm !min-h-[44px]" aria-expanded={showKey} aria-controls={keyId} onClick={() => setShowKey((o) => !o)}>
              <MapIcon className="h-4 w-4" aria-hidden="true" /> Map key
              <ChevronDown className={cn('h-4 w-4 transition-transform', showKey && 'rotate-180')} aria-hidden="true" />
            </button>
            {/* the wrapper carries `hidden`: a display utility on the list itself would override it */}
            <div id={keyId} hidden={!showKey}>
              <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Map key">
                {config.landmarks.map((l) => (
                  <li key={l.id} className="chip border border-line bg-surface py-0.5 text-xs text-ink-soft">
                    <Icon name={l.icon} width={14} height={14} className="text-primary" /> {l.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact North/South/East/West pad: the accessible alternative to tapping squares. */
function CompassPad({ onMove, disabled }: { onMove: (d: Direction) => void; disabled: boolean }) {
  return (
    <div className="grid shrink-0 grid-cols-[repeat(3,3rem)] grid-rows-[repeat(3,3rem)] gap-1" role="group" aria-label="Compass buttons">
      {(['north', 'west', 'east', 'south'] as const).map((direction) => {
        const Arrow = ARROWS[direction];
        return (
          <button
            key={direction}
            type="button"
            onClick={() => onMove(direction)}
            disabled={disabled}
            className={cn('btn btn-secondary !min-h-0 flex-col !gap-0 !rounded-xl !px-0 text-xs', PAD_PLACE[direction])}
            aria-label={`Walk one step ${DIRECTION_NAMES[direction]}`}
          >
            <Arrow className="h-5 w-5 text-primary" aria-hidden="true" />
            <span aria-hidden="true">{DIRECTION_NAMES[direction][0]}</span>
          </button>
        );
      })}
      <span className="col-start-2 row-start-2 m-auto h-2.5 w-2.5 rounded-full bg-ink/15" aria-hidden="true" />
    </div>
  );
}

/** Footprints on the edges between squares, pointing the way the explorer walked this stop. */
function FootprintTrail({ trail, size }: { trail: Cell[]; size: number }) {
  const U = 100;
  return (
    <svg viewBox={`0 0 ${size * U} ${size * U}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      {trail.slice(1).map((cell, i) => {
        const from = trail[i];
        const dir = directionBetween(from, cell);
        if (!dir) return null;
        const x = ((from[0] + cell[0]) / 2 + 0.5) * U;
        const y = ((from[1] + cell[1]) / 2 + 0.5) * U;
        const latest = i === trail.length - 2;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${ROTATION[dir]})`} fill="#8A6239" opacity={latest ? 0.85 : 0.5} className={latest ? 'motion-safe:animate-fade-in' : undefined}>
            <ellipse cx="-7" cy="6" rx="5" ry="8.5" />
            <ellipse cx="7" cy="-6" rx="5" ry="8.5" />
          </g>
        );
      })}
    </svg>
  );
}

function TrailComplete({
  config,
  state,
  headingRef,
  onRestart,
}: {
  config: GridExplorerConfig;
  state: GridState;
  headingRef: Ref<HTMLHeadingElement>;
  onRestart: () => void;
}) {
  const result = gridResult(config, state);
  const headingId = useId();
  const trailId = useId();
  const [showTrail, setShowTrail] = useState(false);
  return (
    <section className="card mx-auto max-w-[560px] animate-pop-in p-5 text-center sm:p-6" aria-labelledby={headingId}>
      <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-reward-soft text-reward-strong">
        <Icon name="star" width={32} height={32} />
      </div>
      <h3 id={headingId} ref={headingRef} tabIndex={-1} className="font-display text-2xl font-semibold outline-none">
        Treasure found!
      </h3>
      <p className="mt-1 text-ink-soft">
        {result.perfect ? 'Every stop found on the first try!' : `${result.correct} of ${result.total} stops found on the first try.`} You walked {state.steps} steps.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-secondary" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Play again
        </button>
        <button type="button" className="btn btn-ghost" aria-expanded={showTrail} aria-controls={trailId} onClick={() => setShowTrail((o) => !o)}>
          Your trail
          <ChevronDown className={cn('h-4 w-4 transition-transform', showTrail && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>
      <div id={trailId} hidden={!showTrail} className="mt-4 text-left">
        <ol className="space-y-2" aria-label="Your treasure trail">
          {config.tasks.map((t) => {
            const place = config.landmarks.find((l) => l.id === t.targetId)!;
            const wrong = state.mistakesByTask[t.id] ?? 0;
            return (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-canvas-sunken/70 px-3 py-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface text-primary shadow-soft">
                  <Icon name={place.icon} width={18} height={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{place.label}</span>
                  <span className="block text-sm text-ink-muted">{describeLegs(legsOf(trailSteps(state.routes[t.id] ?? [])))}</span>
                </span>
                {wrong ? (
                  <span className="text-xs font-bold text-reward-strong">
                    {wrong} wrong stop{wrong === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-success text-white">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">found on the first try</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-center text-sm font-bold text-ink-soft">Remember: North is up, South is down, East is right and West is left.</p>
      </div>
    </section>
  );
}
