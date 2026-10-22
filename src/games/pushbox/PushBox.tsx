import { ArrowRight, Check, ChevronDown, Hand, Lightbulb, NotebookPen, RotateCcw, Star, Trophy } from 'lucide-react';
import { useEffect, useId, useMemo, useReducer, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { SurfacePatterns } from '../../components/art/Illustration';
import { useSound } from '../../hooks/usePreferences';
import type { PushBoxConfig } from '../../domain/types';
import { cn } from '../../lib/cn';
import { beginPointerDrag, type MiniGameProps } from '../framework';
import {
  createPushBoxReducer,
  firstSentence,
  foundSmallestPush,
  frictionPushBack,
  initialPushBoxState,
  isPushBoxComplete,
  maxSlideSteps,
  nextFloorId,
  pushAnimationMs,
  pushBoxResult,
  pushesToComplete,
  pushHint,
  pushLevelAt,
  pushLevelFraction,
  smallestMovingPush,
  snapPushLevel,
  STEPS_PER_LEVEL,
  type PushBoxState,
  type PushOutcome,
} from './pushBoxLogic';

/* Scene geometry (SVG units). */
const W = 480;
const H = 204;
const FLOOR_Y = 132;
const BOX = 64;
const BOX_X = 178; // left edge of the box at rest
const FRONT_X = BOX_X + BOX;
const ARROW_Y = FLOOR_Y - BOX / 2;
const PUSH_TIP_X = BOX_X - 6;
const ARROW_MAX = 140; // length of the strongest push arrow
const HEAD = 16;
const SHAFT_MAX = ARROW_MAX - HEAD;
const HANDLE_R = 22;
const FRICTION_Y = FLOOR_Y + 13;
const FRICTION_TAIL = FRONT_X - 8;
const RULER_END = W - 12;
const PURPLE = '#5847E0';
const CORAL = '#F06A4D';
const FONT = 'Nunito Variable, sans-serif';
const EASE_OUT = 'cubic-bezier(0.15, 0.7, 0.3, 1)';
const SNAP = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/* Force slider thumb diameter (CSS px). */
const THUMB = 56;

/** The control to highlight during the very first push: one step at a time. */
type Guide = 'floor' | 'push' | 'go' | null;

interface PrimaryAction {
  label: string;
  icon: ReactNode;
  tone: string;
  /** Icon after the label (forward arrows). */
  trailing?: boolean;
  onClick?: () => void;
}

export default function PushBox({ config, reducedMotion, onEvent, onComplete, onRestart }: MiniGameProps<PushBoxConfig>) {
  const reducer = useMemo(() => createPushBoxReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, initialPushBoxState);
  const [pushTouched, setPushTouched] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const uid = useId().replace(/:/g, '');
  const resultsId = `${uid}-results`;
  const play = useSound();
  const labels = config.pushLabels;
  const floor = config.floors.find((f) => f.id === state.floorId);
  const completedOnce = useRef(false);
  const timers = useRef<number[]>([]);
  const callbacks = useRef({ onEvent, onComplete });
  useEffect(() => {
    callbacks.current = { onEvent, onComplete };
  }, [onEvent, onComplete]);

  useEffect(() => {
    callbacks.current.onEvent({ key: 'start' });
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  // Let the push play out (slide or shake), then show the result.
  useEffect(() => {
    if (state.phase !== 'pushing' || !state.last) return;
    play(state.last.moved ? 'whoosh' : 'tap');
    const t = window.setTimeout(() => dispatch({ type: 'finish' }), pushAnimationMs(state.last, reducedMotion));
    return () => window.clearTimeout(t);
  }, [state.phase, state.last, reducedMotion, play]);

  // Tell the coach about each finished push, and report the result once every floor has moved.
  const handled = useRef(0);
  useEffect(() => {
    const last = state.last;
    if (state.phase !== 'result' || !last || state.history.length === handled.current) return;
    handled.current = state.history.length;
    const vars = { floor: config.floors.find((f) => f.id === last.floorId)?.name.toLowerCase() ?? '', push: config.pushLabels[last.push - 1]?.toLowerCase() ?? '' };
    callbacks.current.onEvent({ key: last.moved ? 'push-moved' : 'push-stuck', vars });
    if (!completedOnce.current && isPushBoxComplete(state, config)) {
      completedOnce.current = true;
      play('reward');
      timers.current.push(window.setTimeout(() => callbacks.current.onEvent({ key: 'complete' }), 1800));
      callbacks.current.onComplete(pushBoxResult(state, config));
    }
  }, [state, config, play]);

  const animating = state.phase === 'pushing';
  const result = state.phase === 'result' ? state.last : null;
  // The push that moved the box on the last floor gets the celebration instead of the usual result.
  const finishedNow = Boolean(result) && state.history.length === pushesToComplete(state, config);
  const firstPush = state.history.length === 0 && state.phase === 'ready';
  const guide: Guide = !firstPush ? null : !floor ? 'floor' : !pushTouched ? 'push' : 'go';
  // Hints only appear after repeated pushes that left the box still on this floor.
  const hint = floor ? pushHint(state, config, floor.id) : null;

  const selectFloor = (id: string) => {
    if (animating) return;
    dispatch({ type: 'select-floor', floorId: id });
    play('tap');
    onEvent({ key: `floor-selected:${id}` });
  };

  // Dragging, tapping the track and the arrow keys all land here, one whole level at a time.
  const setPush = (level: number) => {
    if (animating) return;
    setPushTouched(true);
    if (level === state.push) return;
    dispatch({ type: 'set-push', push: level });
    play('tap');
  };

  const tryAgain = () => {
    dispatch({ type: 'again' });
    play('tap');
  };

  const nextFloor = () => {
    const id = nextFloorId(state, config);
    if (id) selectFloor(id);
  };

  // One obvious next action. Push! only appears once a push has been chosen for the first time.
  const primary: PrimaryAction | null = !floor
    ? null
    : animating
      ? { label: 'Pushing...', icon: <Hand className="h-5 w-5" aria-hidden="true" />, tone: 'btn-success' }
      : !result
        ? pushTouched || state.history.length > 0
          ? { label: 'Push!', icon: <Hand className="h-5 w-5" aria-hidden="true" />, tone: 'btn-success', onClick: () => dispatch({ type: 'push' }) }
          : null
        : finishedNow
          ? { label: 'Play again', icon: <RotateCcw className="h-5 w-5" aria-hidden="true" />, tone: 'btn-secondary', onClick: onRestart }
          : result.moved
            ? { label: 'Next floor', icon: <ArrowRight className="h-5 w-5" aria-hidden="true" />, tone: 'btn-primary', trailing: true, onClick: nextFloor }
            : { label: 'Try again', icon: <RotateCcw className="h-5 w-5" aria-hidden="true" />, tone: 'btn-primary', onClick: tryAgain };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* progress, with the notebook tucked behind a toggle */}
      <div className="flex items-center justify-between gap-2">
        <FloorProgress state={state} config={config} />
        <button
          type="button"
          aria-expanded={resultsOpen}
          aria-controls={resultsId}
          onClick={() => setResultsOpen((o) => !o)}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-2xl border border-line bg-surface px-3 text-sm font-extrabold text-ink-soft shadow-soft hover:text-primary"
        >
          <NotebookPen className="h-4 w-4" aria-hidden="true" />
          My results
          <ChevronDown className={cn('h-4 w-4 transition-transform', resultsOpen && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>
      {resultsOpen && <ResultsPanel id={resultsId} state={state} config={config} reducedMotion={reducedMotion} />}

      {/* step 1: choose a floor */}
      <fieldset>
        <legend className="sr-only">Choose a floor</legend>
        <div
          className={cn('grid grid-cols-3 gap-2 rounded-3xl transition sm:gap-3', guide === 'floor' && 'ring-4 ring-primary/30 ring-offset-4 ring-offset-canvas')}
          role="radiogroup"
          aria-label="Floor"
        >
          {config.floors.map((f) => {
            const selected = state.floorId === f.id;
            const moved = smallestMovingPush(state, f.id) !== undefined;
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={animating}
                onClick={() => selectFloor(f.id)}
                className={cn(
                  'relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-2 text-center transition disabled:cursor-not-allowed',
                  selected ? 'border-primary bg-primary-soft shadow-soft' : 'border-line bg-surface hover:border-primary/40',
                )}
              >
                <svg viewBox="0 0 60 30" className="h-8 w-full rounded-xl" aria-hidden="true">
                  <SurfacePatterns prefix={`${uid}-${f.id}`} />
                  <rect width="60" height="30" fill={`url(#${uid}-${f.id}-${f.texture})`} />
                </svg>
                <span className="text-sm font-extrabold leading-tight">{f.name}</span>
                {moved && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-success text-white shadow-soft">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">box moved</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* the scene */}
      <PushScene
        uid={uid}
        texture={floor?.texture}
        state={state}
        labels={labels}
        maxSteps={maxSlideSteps(config)}
        reducedMotion={reducedMotion}
        canDrag={Boolean(floor) && !animating}
        dragHint={guide === 'push'}
        label={sceneLabel(state, labels, floor?.name)}
        onLevel={setPush}
      />

      {/* step 2 and 3: how hard, then Push! (the result takes their place until the next try) */}
      {floor && (
        <div className={cn('card flex flex-col gap-3 p-3 sm:p-4', !reducedMotion && 'animate-fade-up')}>
          <div role="status" className="empty:hidden">
            {result &&
              (finishedNow ? (
                <CompleteFeedback config={config} reducedMotion={reducedMotion} />
              ) : (
                <ResultFeedback
                  outcome={result}
                  explanation={floor.explanation}
                  hint={hint}
                  smallest={result.moved && result.push === result.grip + 1}
                  reducedMotion={reducedMotion}
                />
              ))}
          </div>
          {!result && <ForceSlider value={state.push} labels={labels} disabled={animating} highlight={guide === 'push'} reducedMotion={reducedMotion} onChange={setPush} />}
          {!result && hint && (
            <p className="flex gap-2 text-[0.95rem] font-bold leading-snug text-ink">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-reward-strong" aria-hidden="true" />
              {hint}
            </p>
          )}
          {primary && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="relative flex flex-1 sm:flex-none">
                {guide === 'go' && (
                  <span className={cn('pointer-events-none absolute inset-0 rounded-2xl', reducedMotion ? 'ring-4 ring-success/40 ring-offset-2' : 'animate-pulse-ring')} aria-hidden="true" />
                )}
                <button type="button" className={cn('btn btn-lg w-full sm:min-w-[11rem]', primary.tone)} disabled={!primary.onClick} onClick={primary.onClick}>
                  {!primary.trailing && primary.icon}
                  {primary.label}
                  {primary.trailing && primary.icon}
                </button>
              </span>
              {result?.moved && !finishedNow && (
                <button type="button" className="btn btn-secondary" onClick={tryAgain}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Try again
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const formatSteps = (d: number) => `${d} ${d === 1 ? 'step' : 'steps'}`;

function sceneLabel(state: PushBoxState, labels: string[], floorName?: string): string {
  const on = floorName ? `the ${floorName.toLowerCase()}` : 'the floor';
  const last = state.phase === 'ready' ? null : state.last;
  if (last && !last.moved) return `The box did not move. Friction on ${on} pushed back just as hard as your push of ${last.push}.`;
  if (last) return state.phase === 'pushing' ? `The box is sliding on ${on}.` : `The box slid ${formatSteps(last.distance)} on ${on} before friction stopped it.`;
  return `A wooden box sits on ${on}. Your push arrow is set to ${labels[state.push - 1].toLowerCase()} (${state.push}).`;
}

/** Compact progress: one dot per floor, filled once the box has moved there. */
function FloorProgress({ state, config }: { state: PushBoxState; config: PushBoxConfig }) {
  const total = config.floors.length;
  const moved = config.floors.filter((f) => smallestMovingPush(state, f.id) !== undefined).length;
  return (
    <p className="flex min-w-0 items-center gap-2 text-sm font-extrabold text-ink-soft">
      <span className="flex shrink-0 gap-1" aria-hidden="true">
        {config.floors.map((f) => (
          <span key={f.id} className={cn('h-3 w-3 rounded-full', smallestMovingPush(state, f.id) !== undefined ? 'bg-success' : 'bg-ink/15')} />
        ))}
      </span>
      {moved === total ? `All ${total} floors moved` : `${moved} of ${total} floors moved`}
    </p>
  );
}

/**
 * Pointer handlers that turn a horizontal drag into whole push levels. Pointer
 * capture keeps the drag going when the finger slides off the element.
 */
function usePushDrag(levelAt: (clientX: number, el: HTMLDivElement) => number | null, onLevel: (level: number) => void, enabled: boolean) {
  const [dragging, setDragging] = useState(false);
  const lastLevel = useRef<number | null>(null);
  const update = (e: ReactPointerEvent<HTMLDivElement>) => {
    const level = levelAt(e.clientX, e.currentTarget);
    if (level === null || level === lastLevel.current) return;
    lastLevel.current = level;
    onLevel(level);
  };
  const end = () => {
    lastLevel.current = null;
    setDragging(false);
  };
  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled || e.button > 0) return;
      beginPointerDrag(e);
      lastLevel.current = null;
      setDragging(true);
      update(e);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (dragging && enabled) update(e);
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
  };
  return { dragging, handlers };
}

function PushScene({
  uid,
  texture,
  state,
  labels,
  maxSteps,
  reducedMotion,
  canDrag,
  dragHint,
  label,
  onLevel,
}: {
  uid: string;
  texture?: string;
  state: PushBoxState;
  labels: string[];
  maxSteps: number;
  reducedMotion: boolean;
  canDrag: boolean;
  dragHint: boolean;
  label: string;
  onLevel(level: number): void;
}) {
  const levels = labels.length;
  const unit = ARROW_MAX / levels; // arrow length per push level, shared by both arrows so they compare fairly
  const stepPx = (RULER_END - FRONT_X) / maxSteps;
  const last = state.phase === 'ready' ? null : state.last;
  const animating = state.phase === 'pushing';
  const push = last?.push ?? state.push;
  const friction = last ? frictionPushBack(last.push, last.grip) : null;
  const pushLen = push * unit;
  const frictionLen = Math.max(1, friction ?? 1) * unit;
  const frictionShown = friction !== null && friction > 0;
  const balanced = Boolean(last && !last.moved);
  const boxOffset = last?.moved ? last.distance * stepPx : 0;
  const snap = reducedMotion ? 'none' : `transform 160ms ${SNAP}`;
  // The drag zone covers x = 0..BOX_X of the scene: dragging the hand left stretches the push arrow.
  const { dragging, handlers } = usePushDrag(
    (clientX, el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 ? snapPushLevel((PUSH_TIP_X - ((clientX - r.left) / r.width) * BOX_X) / unit, levels) : null;
    },
    onLevel,
    canDrag,
  );
  const tipX = FRICTION_TAIL - frictionLen;

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-[#EEF2FF] to-[#FDF8EF]">
      <div className="relative mx-auto w-full max-w-[720px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" role="img" aria-label={label}>
          <SurfacePatterns prefix={uid} />
          <rect x="0" y={FLOOR_Y} width={W} height="26" fill={texture ? `url(#${uid}-${texture})` : '#D8D2C8'} />
          <rect x="0" y={FLOOR_Y} width={W} height="3" fill="rgb(29 26 74 / 0.12)" />
          {/* ruler: how far the front of the box slides */}
          {Array.from({ length: Math.floor(maxSteps) + 1 }, (_, i) => (
            <g key={i}>
              <line x1={FRONT_X + i * stepPx} y1={FLOOR_Y + 32} x2={FRONT_X + i * stepPx} y2={FLOOR_Y + 44} stroke="rgb(29 26 74 / 0.3)" strokeWidth="2" />
              <text x={FRONT_X + i * stepPx} y={FLOOR_Y + 62} textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="16" fill="#46437A">
                {i}
              </text>
            </g>
          ))}
          <text x={FRONT_X - 16} y={FLOOR_Y + 62} textAnchor="end" fontFamily={FONT} fontWeight="800" fontSize="14" fill="#69668E">
            steps
          </text>

          {balanced && (
            <g>
              <rect x={BOX_X + BOX / 2 - 46} y={FLOOR_Y - BOX - 36} width="92" height="26" rx="13" fill="#fff" stroke="rgb(29 26 74 / 0.12)" strokeWidth="1.5" />
              <text x={BOX_X + BOX / 2} y={FLOOR_Y - BOX - 18} textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="14" fill="#1D1A4A">
                Balanced
              </text>
            </g>
          )}

          {/* push arrow: the shaft is drawn at full length and scaled from the arrowhead end */}
          <rect
            x={PUSH_TIP_X - HEAD - SHAFT_MAX}
            y={ARROW_Y - 5}
            width={SHAFT_MAX + 2}
            height="10"
            fill={PURPLE}
            style={{ transformBox: 'fill-box', transformOrigin: 'right center', transform: `scaleX(${(pushLen - HEAD) / SHAFT_MAX})`, transition: snap }}
          />
          <path d={`M ${PUSH_TIP_X} ${ARROW_Y} L ${PUSH_TIP_X - HEAD - 2} ${ARROW_Y - 12} L ${PUSH_TIP_X - HEAD - 2} ${ARROW_Y + 12} Z`} fill={PURPLE} />
          {/* the hand at the tail: drag it back to push harder */}
          <g style={{ transform: `translateX(${-pushLen}px)`, transition: snap }}>
            {dragHint && <circle cx={PUSH_TIP_X} cy={ARROW_Y} r={HANDLE_R + 8} fill="none" stroke={PURPLE} strokeOpacity="0.35" strokeWidth="4" className={cn(!reducedMotion && 'animate-pulse')} />}
            <circle cx={PUSH_TIP_X} cy={ARROW_Y} r={HANDLE_R} fill={dragging ? '#EEEBFF' : '#fff'} stroke={PURPLE} strokeWidth="4" />
            <g transform={`rotate(90 ${PUSH_TIP_X} ${ARROW_Y})`}>
              <Hand x={PUSH_TIP_X - 12} y={ARROW_Y - 12} size={24} color={PURPLE} strokeWidth={2.5} aria-hidden="true" />
            </g>
            <text x={PUSH_TIP_X} y={ARROW_Y - HANDLE_R - 9} textAnchor="middle" fontFamily={FONT} fontWeight="800" fontSize="15" fill="#4031B8">
              Push
            </text>
          </g>

          {/* box, carrying its friction arrow when it slides */}
          <g
            style={{
              transform: `translateX(${boxOffset}px)`,
              transition: animating && last?.moved && !reducedMotion ? `transform ${pushAnimationMs(last, false)}ms ${EASE_OUT}` : 'none',
            }}
          >
            <g className={cn(animating && balanced && !reducedMotion && 'animate-shake')}>
              <rect x={BOX_X} y={FLOOR_Y - BOX} width={BOX} height={BOX} rx="6" fill="#D9A066" stroke="#8A6239" strokeWidth="3" />
              <path d={`M ${BOX_X + 6} ${FLOOR_Y - BOX + 6} L ${FRONT_X - 6} ${FLOOR_Y - 6} M ${FRONT_X - 6} ${FLOOR_Y - BOX + 6} L ${BOX_X + 6} ${FLOOR_Y - 6}`} stroke="#B98B5C" strokeWidth="4" />
            </g>
            {/* friction: along the floor, against the push; it grows from the box to match the push */}
            <path
              d={`M ${tipX} ${FRICTION_Y} L ${tipX + HEAD} ${FRICTION_Y - 10} L ${tipX + HEAD} ${FRICTION_Y - 4} L ${FRICTION_TAIL} ${FRICTION_Y - 4} L ${FRICTION_TAIL} ${FRICTION_Y + 4} L ${tipX + HEAD} ${FRICTION_Y + 4} L ${tipX + HEAD} ${FRICTION_Y + 10} Z`}
              fill={CORAL}
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinejoin="round"
              paintOrder="stroke"
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'right center',
                transform: `scaleX(${frictionShown ? 1 : 0})`,
                transition: reducedMotion ? 'none' : `transform 450ms ${SNAP}`,
              }}
            />
            <text
              x={tipX - 6}
              y={FRICTION_Y + 5}
              textAnchor="end"
              fontFamily={FONT}
              fontWeight="800"
              fontSize="14"
              fill="#B04028"
              stroke="#fff"
              strokeWidth="4"
              strokeLinejoin="round"
              paintOrder="stroke"
              opacity={frictionShown ? 1 : 0}
              style={{ transition: reducedMotion ? 'none' : 'opacity 300ms ease-out 150ms' }}
            >
              Friction
            </text>
          </g>
        </svg>
        {/* drag zone over the push arrow (the force slider is the accessible, tap-friendly equivalent) */}
        <div
          aria-hidden="true"
          data-drag="push-arrow"
          className={cn('absolute left-0 top-0 touch-none', canDrag ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'pointer-events-none')}
          style={{ width: `${(BOX_X / W) * 100}%`, height: `${(FLOOR_Y / H) * 100}%` }}
          {...handlers}
        />
      </div>
      {/* the two values that matter: push against friction */}
      <div className="flex items-center justify-center gap-2 border-t border-line/70 bg-surface/80 px-3 py-2" aria-hidden="true">
        <span className="chip bg-primary-soft text-primary-strong">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Push {push}
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-canvas-sunken font-display text-lg font-semibold leading-none text-ink">{!last ? '?' : last.moved ? '>' : '='}</span>
        <span className="chip bg-coral-soft text-coral-strong">
          <span className="h-2.5 w-2.5 rounded-full bg-coral" /> Friction {friction ?? '?'}
        </span>
      </div>
    </div>
  );
}

/** A chunky, snapping force slider: drag or tap the track, or use the arrow keys. */
function ForceSlider({
  value,
  labels,
  disabled,
  highlight,
  reducedMotion,
  onChange,
}: {
  value: number;
  labels: string[];
  disabled: boolean;
  highlight: boolean;
  reducedMotion: boolean;
  onChange(level: number): void;
}) {
  const levels = labels.length;
  const { dragging, handlers } = usePushDrag(
    (clientX, el) => {
      const r = el.getBoundingClientRect();
      return r.width > THUMB ? pushLevelAt((clientX - r.left - THUMB / 2) / (r.width - THUMB), levels) : null;
    },
    onChange,
    !disabled,
  );
  const at = (level: number) => `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${pushLevelFraction(level, levels)})`;
  const ease = reducedMotion ? 'none' : `left 160ms ${SNAP}, width 160ms ${SNAP}, transform 160ms ${SNAP}`;
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: value + 1, ArrowUp: value + 1, PageUp: value + 1, ArrowLeft: value - 1, ArrowDown: value - 1, PageDown: value - 1, Home: 1, End: levels };
    if (disabled || !(e.key in keys)) return;
    e.preventDefault();
    onChange(snapPushLevel(keys[e.key], levels));
  };

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Push strength"
      aria-valuemin={1}
      aria-valuemax={levels}
      aria-valuenow={value}
      aria-valuetext={`${labels[value - 1]} push, ${value} of ${levels}`}
      aria-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
      {...handlers}
      className={cn('relative h-[84px] touch-none select-none rounded-2xl', disabled ? 'cursor-not-allowed opacity-50' : dragging ? 'cursor-grabbing' : 'cursor-grab')}
    >
      <span className="absolute top-[22px] h-3 rounded-full bg-ink/10" style={{ left: THUMB / 2, right: THUMB / 2 }} />
      <span className="absolute top-[22px] h-3 rounded-full bg-primary" style={{ left: THUMB / 2, width: `calc((100% - ${THUMB}px) * ${pushLevelFraction(value, levels)})`, transition: ease }} />
      {labels.map((label, i) => (
        <span key={label} className="absolute top-[18px] -translate-x-1/2" style={{ left: at(i + 1) }}>
          <span className={cn('block h-5 w-5 rounded-full border-4 bg-surface transition-colors', i < value ? 'border-primary' : 'border-line-strong')} />
          <span className={cn('absolute left-1/2 top-[46px] -translate-x-1/2 whitespace-nowrap text-xs font-extrabold', i + 1 === value ? 'text-primary-strong' : 'text-ink-muted')}>{label}</span>
        </span>
      ))}
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-0 grid -translate-x-1/2 place-items-center rounded-full bg-primary text-white shadow-press-primary ring-4',
          highlight ? (reducedMotion ? 'ring-primary/30' : 'animate-pulse-ring ring-surface') : 'ring-surface',
          dragging && 'scale-110',
        )}
        style={{ left: at(value), width: THUMB, height: THUMB, transition: ease }}
      >
        <Hand className="h-7 w-7 rotate-90" />
      </span>
    </div>
  );
}

/** One result line, plus one short sentence (the floor's explanation, or a hint after repeated tries). */
function ResultFeedback({
  outcome,
  explanation,
  hint,
  smallest,
  reducedMotion,
}: {
  outcome: PushOutcome;
  explanation: string;
  hint: string | null;
  smallest: boolean;
  reducedMotion: boolean;
}) {
  return (
    <div className={cn('rounded-2xl border-2 px-4 py-3', !reducedMotion && 'animate-pop-in', outcome.moved ? 'border-success/40 bg-success-soft' : 'border-reward/50 bg-reward-soft')}>
      {outcome.moved ? (
        <>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-lg font-semibold">
            It slid {formatSteps(outcome.distance)}!
            {smallest && (
              <span className="chip bg-surface px-2.5 py-0.5 font-sans text-xs text-success-strong">
                <Star className="h-3.5 w-3.5 fill-reward text-reward" aria-hidden="true" /> Smallest push!
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[0.95rem] leading-snug text-ink-soft">{firstSentence(explanation)}</p>
        </>
      ) : (
        <>
          <p className="font-display text-lg font-semibold">The box did not move.</p>
          <p className="mt-0.5 text-[0.95rem] leading-snug text-ink-soft">Friction pushed back just as hard as your push.</p>
          {hint && (
            <p className="mt-2 flex gap-2 text-[0.95rem] font-bold leading-snug text-ink">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-reward-strong" aria-hidden="true" />
              {hint}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function CompleteFeedback({ config, reducedMotion }: { config: PushBoxConfig; reducedMotion: boolean }) {
  const floors = [...config.floors].sort((a, b) => b.grip - a.grip);
  return (
    <div className={cn('rounded-2xl border-2 border-success/40 bg-success-soft px-4 py-3', !reducedMotion && 'animate-pop-in')}>
      <p className="flex items-center gap-2 font-display text-lg font-semibold">
        <Trophy className="h-5 w-5 shrink-0 text-success-strong" aria-hidden="true" /> You moved the box on every floor!
      </p>
      {floors.length > 1 && (
        <p className="mt-0.5 text-[0.95rem] leading-snug text-ink-soft">
          {floors[0].name} pushed back the hardest, and {floors[floors.length - 1].name.toLowerCase()} the least.
        </p>
      )}
    </div>
  );
}

/** The lab notebook: per-floor results, the bonus and the model note. Closed by default. */
function ResultsPanel({ id, state, config, reducedMotion }: { id: string; state: PushBoxState; config: PushBoxConfig; reducedMotion: boolean }) {
  const exact = config.floors.filter((f) => foundSmallestPush(state, config, f.id)).length;
  return (
    <section id={id} aria-label="My results" className={cn('card p-4', !reducedMotion && 'animate-fade-up')}>
      <ul className="space-y-2">
        {config.floors.map((f) => {
          const smallest = smallestMovingPush(state, f.id);
          const tries = state.history.filter((h) => h.floorId === f.id).length;
          return (
            <li key={f.id} className="flex items-center justify-between gap-3 rounded-2xl bg-canvas px-3 py-2 text-sm">
              <span className="font-bold">{f.name}</span>
              <span className="flex items-center gap-1.5 text-right text-ink-soft">
                {smallest ? `Moved with ${config.pushLabels[smallest - 1].toLowerCase()} (${smallest})` : tries ? `Not moved yet (${tries} ${tries === 1 ? 'try' : 'tries'})` : 'Not tried'}
                {foundSmallestPush(state, config, f.id) && (
                  <>
                    <Star className="h-4 w-4 shrink-0 fill-reward text-reward" aria-hidden="true" />
                    <span className="sr-only">smallest push found</span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex items-start gap-1.5 text-sm font-bold">
        <Star className="mt-0.5 h-4 w-4 shrink-0 fill-reward text-reward" aria-hidden="true" />
        Bonus: smallest push found on {exact} of {config.floors.length} floors.
      </p>
      <p className="mt-2 text-xs text-ink-muted">
        Model note: each floor has a fixed amount of friction grip, and a push bigger than the grip slides the box {STEPS_PER_LEVEL} steps for each extra level. It is a
        simplified teaching model, not an exact measurement.
      </p>
    </section>
  );
}
