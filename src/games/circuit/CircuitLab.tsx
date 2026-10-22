import { ArrowRight, Ban, Check, ChevronDown, Hand, Lightbulb, LightbulbOff, RotateCcw, ShieldAlert, Trophy, Zap } from 'lucide-react';
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
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { ObjectPicture } from '../../components/art/ObjectArt';
import { Icon } from '../../components/ui/Icon';
import type { CircuitConfig } from '../../domain/types';
import { useSound } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { beginPointerDrag, type MiniGameProps } from '../framework';
// Pointer geometry shared with Concept Match and the Sort game (pure helpers, unit tested in match/dragMath.test.ts).
import { dropTargetAt, ghostTransform, grabOffset, passedDragThreshold, toBox, type Point } from '../match/dragMath';
import {
  circuitFeedback,
  circuitHint,
  circuitResult,
  createCircuitReducer,
  findItem,
  initialCircuitState,
  isLit,
  testedGroups,
  type CircuitFeedback,
  type CircuitItem,
} from './circuitLogic';

/** A drop this close (px) to the gap still counts, which forgives small fingers. */
const GAP_TOLERANCE = 32;
const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';

/** Shape of an object card (and of its drag ghost). */
const OBJECT_CARD =
  'relative flex min-h-[52px] w-full min-w-0 items-center gap-2 rounded-2xl border-2 px-2.5 py-2 text-left font-display text-[0.95rem] font-semibold leading-tight sm:px-3 sm:text-lg';

/* SVG layout (viewBox units). The loop: cell on the left, bulb at the top, switch on the right, gap at the bottom. */
const LEFT = 44;
const RIGHT = 316;
const TOP = 60;
const BOTTOM = 172;
const BULB = { x: 180, y: 34 };
const SWITCH = { x: RIGHT, top: 96, bottom: 140 };
const GAP = { left: 134, right: 226 };
/** The gap widens for long names up to this half-width; the object's picture in it is this big. */
const GAP_MAX_HALF = 100;
const GAP_PICTURE = 24;
/** Room for one letter of a name in the gap (13 px, extra bold; real letters are 5.7 to 7.3 wide). */
const LABEL_CHAR = 7.4;

/** A press on an object card. It turns into a drag once the pointer moves past the threshold. */
interface Press {
  id: string;
  pointerId: number;
  start: Point;
  offset: Point;
  dragging: boolean;
  returning: boolean;
}

function animateEl(el: Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null {
  return el && typeof el.animate === 'function' ? el.animate(keyframes, options) : null;
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
 * Circuit Lab (on screen only): put an object in the gap of the circuit, by dragging
 * its card there or tapping it, then turn the switch on. The bulb lights only when the
 * switch is on and the object lets electricity through.
 * Keyboard: the object cards and the switch are buttons; Escape takes the object out.
 */
export default function CircuitLab({ config, reducedMotion, onEvent, onComplete, onRestart }: MiniGameProps<CircuitConfig>) {
  const reducer = useMemo(() => createCircuitReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, initialCircuitState);
  // Set when the main button is pressed before it can be used, so the child is told why nothing happened.
  const [tooSoon, setTooSoon] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const play = useSound();
  const uid = useId().replace(/:/g, '');
  const animate = !reducedMotion;
  const round = config.rounds[Math.min(state.round, config.rounds.length - 1)];

  const callbacks = useRef({ onEvent, onComplete });
  useEffect(() => {
    callbacks.current = { onEvent, onComplete };
  }, [onEvent, onComplete]);

  useEffect(() => {
    callbacks.current.onEvent({ key: 'start' });
  }, []);

  /* ------------------------------------------ events, sounds and completion */
  // Every test of the circuit (an object in the gap with the switch on) is reported once.
  const lastTest = useRef(state.lastTest);
  useEffect(() => {
    const test = state.lastTest;
    if (!test || test === lastTest.current) return;
    lastTest.current = test;
    const item = findItem(config, test.itemId);
    const now = config.rounds[state.round];
    if (!item || !now) return;
    callbacks.current.onEvent({ key: test.lit ? 'bulb-on' : 'bulb-off', vars: { item: item.label } });
    if (test.solved) {
      play('correct');
      callbacks.current.onEvent({ key: 'round-correct', vars: { explanation: now.explanation } });
    } else if (test.mistake) {
      play('incorrect');
      callbacks.current.onEvent({ key: 'round-incorrect', vars: { hint: circuitHint(config, state)?.text ?? now.hint } });
    } else {
      play(test.lit ? 'whoosh' : 'tap');
    }
  }, [state, config, play]);

  const reported = useRef(false);
  useEffect(() => {
    if (state.phase !== 'complete' || reported.current) return;
    reported.current = true;
    const result = circuitResult(config, state);
    play('reward');
    callbacks.current.onEvent({ key: result.perfect ? 'complete:perfect' : 'complete' });
    callbacks.current.onComplete(result);
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

  /* ------------------------------------------------------ circuit actions */
  const place = (id: string) => {
    setTooSoon(false);
    if (state.inGap === id) return;
    // A test follows when the switch is already on; its result has its own sound.
    if (!state.switchOn) play('tap');
    dispatch({ type: 'place', itemId: id });
  };
  const takeOut = () => {
    setTooSoon(false);
    if (state.inGap === null) return;
    play('tap');
    dispatch({ type: 'remove' });
  };
  const toggleSwitch = () => {
    setTooSoon(false);
    if (state.switchOn || state.inGap === null) play('tap');
    dispatch({ type: 'switch' });
  };

  /* ------------------------------------------------------- drag and drop */
  // While dragging, a copy of the card follows the pointer in a fixed layer (so it can never
  // widen the page), and the card itself stays behind as a faint placeholder.
  const cardEls = useRef(new Map<string, HTMLButtonElement>());
  const gapRef = useRef<SVGRectElement>(null);
  const press = useRef<Press | null>(null);
  const pointer = useRef<Point>({ x: 0, y: 0 });
  const ghost = useRef<HTMLDivElement | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{ id: string; width: number } | null>(null);
  const [overGap, setOverGap] = useState(false);

  // Place the ghost under the pointer as soon as it mounts; later moves update it directly.
  const setGhost = useCallback((el: HTMLDivElement | null) => {
    ghost.current = el;
    if (el && press.current) el.style.transform = ghostTransform(pointer.current, press.current.offset);
  }, []);

  const isOverGap = (p: Point) => {
    const el = gapRef.current;
    return el ? dropTargetAt(p, [toBox('gap', el.getBoundingClientRect())], GAP_TOLERANCE) === 'gap' : false;
  };

  const endDrag = () => {
    press.current = null;
    setDrag(null);
    setOverGap(false);
  };

  // A missed or cancelled drop glides back to its card (or simply disappears with reduced motion).
  const flyBack = (pr: Press) => {
    pr.returning = true;
    setOverGap(false);
    const el = ghost.current;
    const home = cardEls.current.get(pr.id)?.getBoundingClientRect();
    const anim =
      animate && el && home
        ? animateEl(el, [{ transform: el.style.transform }, { transform: ghostTransform({ x: home.left, y: home.top }, { x: 0, y: 0 }) }], { duration: 220, easing: EASE_OUT, fill: 'forwards' })
        : null;
    if (!anim) return endDrag();
    anim.onfinish = endDrag;
    anim.oncancel = endDrag;
  };

  const onCardPointerDown = (e: ReactPointerEvent<HTMLButtonElement>, id: string) => {
    suppressClick.current = false;
    if (press.current?.dragging || (e.pointerType === 'mouse' && e.button !== 0)) return;
    beginPointerDrag(e);
    const p = { x: e.clientX, y: e.clientY };
    press.current = { id, pointerId: e.pointerId, start: p, offset: grabOffset(p, e.currentTarget.getBoundingClientRect()), dragging: false, returning: false };
    pointer.current = p;
  };

  const onCardPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.pointerId !== e.pointerId || pr.returning) return;
    pointer.current = { x: e.clientX, y: e.clientY };
    if (!pr.dragging) {
      if (!passedDragThreshold(pr.start, pointer.current)) return;
      pr.dragging = true;
      setTooSoon(false);
      setDrag({ id: pr.id, width: e.currentTarget.offsetWidth });
      play('tap');
    }
    if (ghost.current) ghost.current.style.transform = ghostTransform(pointer.current, pr.offset);
    setOverGap(isOverGap(pointer.current));
  };

  const onCardPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.pointerId !== e.pointerId || pr.returning) return;
    if (!pr.dragging) {
      // A tap: the click that follows puts the object in the gap.
      press.current = null;
      return;
    }
    suppressClick.current = true;
    pointer.current = { x: e.clientX, y: e.clientY };
    if (!isOverGap(pointer.current)) return flyBack(pr);
    endDrag();
    place(pr.id);
  };

  const onCardPointerCancel = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.pointerId !== e.pointerId || pr.returning) return;
    if (pr.dragging) flyBack(pr);
    else press.current = null;
  };

  /* ----------------------------------------------------- tap and keyboard */
  const onCardClick = (id: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    // Tapping the object that is already in the gap takes it out again.
    if (state.inGap === id) takeOut();
    else place(id);
  };

  const onPlayKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    // A touch drag may end without a click; never let that swallow the next key press.
    suppressClick.current = false;
    if (e.key !== 'Escape' || state.inGap === null) return;
    e.preventDefault();
    takeOut();
  };

  const registerCard = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) cardEls.current.set(id, el);
    else cardEls.current.delete(id);
  };

  /* ---------------------------------------------------------- the finish */
  if (state.phase === 'complete') {
    const result = circuitResult(config, state);
    return (
      <div className={cn('card p-5 text-center sm:p-6', animate && 'animate-pop-in')}>
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
          <Trophy className="h-8 w-8" aria-hidden="true" />
        </div>
        <h3 ref={doneRef} tabIndex={-1} className="font-display text-2xl font-semibold focus:outline-none">
          Circuit lab complete!
        </h3>
        <p className="mt-1 text-ink-soft">{result.perfect ? 'Every round right on the first try. Perfect!' : `${result.correct} of ${result.total} rounds right on the first try.`}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button type="button" className="btn btn-secondary btn-sm min-h-[44px]" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Play again
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm min-h-[44px] px-3"
            aria-expanded={showResults}
            aria-controls={`${uid}-results`}
            onClick={() => setShowResults((open) => !open)}
          >
            Your results <ChevronDown className={cn('h-4 w-4', animate && 'transition-transform', showResults && 'rotate-180')} aria-hidden="true" />
          </button>
        </div>
        <ul id={`${uid}-results`} hidden={!showResults} aria-label="Your results" className="mt-4 space-y-2 text-left">
          {config.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2.5 rounded-2xl bg-canvas px-3 py-2.5 text-sm">
              <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg', item.conducts ? 'bg-reward-soft text-reward-strong' : 'bg-canvas-sunken text-ink-soft')}>
                {item.conducts ? <Zap className="h-4 w-4" aria-hidden="true" /> : <Ban className="h-4 w-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className="font-bold">
                  {item.label}: {item.conducts ? 'conductor' : 'insulator'}.
                </span>{' '}
                {item.explanation}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  /* ---------------------------------------------------------- view state */
  const correct = state.phase === 'correct';
  const lastRound = state.round >= config.rounds.length - 1;
  const inGap = findItem(config, state.inGap);
  const lit = isLit(config, state);
  const dragItem = drag ? findItem(config, drag.id) : undefined;
  const testAll = round.goal === 'test-all';
  const groups = testedGroups(config, state);
  const testedCount = groups.conductors.length + groups.insulators.length;
  const waitLabel = testAll ? 'Test every object to continue' : 'Light the bulb to continue';
  const waitHelp = testAll
    ? `Put each object in the gap and turn the switch on. ${testedCount} of ${config.items.length} tested.`
    : 'Put an object in the gap and turn the switch on. The bulb lights only if the object lets electricity through.';
  const helpId = `${uid}-help`;
  const showHelp = tooSoon && !correct;

  // One line under the circuit: what the circuit is doing, why, or a hint.
  let feedback: ReactNode = null;
  if (drag) {
    feedback = (
      <FeedbackLine tone="info" icon={<Hand className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}>
        {overGap ? 'Let go to put it in the gap.' : 'Drop it in the gap.'}
      </FeedbackLine>
    );
  } else if (showHelp) {
    feedback = (
      <p id={helpId} className="font-bold text-ink-soft">
        {waitHelp}
      </p>
    );
  } else {
    const fb = circuitFeedback(config, state);
    if (fb) feedback = <CircuitLine key={`${fb.text}|${fb.detail?.text ?? ''}`} fb={fb} animate={animate} />;
  }

  const switchText = state.switchOn ? 'on (closed)' : 'off (open)';
  const circuitLabel = `On-screen circuit with a cell, a switch, a bulb and a gap. The switch is ${switchText}. ${inGap ? `${inGap.label} is in the gap.` : 'The gap is empty.'} The bulb is ${lit ? 'lit' : 'off'}.`;

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

      {/* The one play area: the circuit, the switch, the objects (and the test results). */}
      <div onKeyDown={onPlayKeyDown} className={cn('card space-y-4 p-4 sm:p-6', correct && 'ring-4 ring-success/30')}>
        <CircuitPicture
          label={circuitLabel}
          switchOn={state.switchOn}
          lit={lit}
          object={inGap}
          overGap={overGap}
          dragging={Boolean(drag)}
          animate={animate}
          gapRef={gapRef}
        />

        <div className="flex justify-center">
          <button
            type="button"
            aria-pressed={state.switchOn}
            onClick={toggleSwitch}
            className={cn('btn min-h-[48px] gap-3 px-5', state.switchOn ? 'btn-secondary border-success text-success-strong' : 'btn-secondary')}
          >
            <span aria-hidden="true" className={cn('relative h-7 w-12 shrink-0 rounded-full', state.switchOn ? 'bg-success' : 'bg-ink/25')}>
              <span
                className={cn('absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-soft', animate && 'transition-transform duration-200', state.switchOn && 'translate-x-5')}
              />
            </span>
            {state.switchOn ? 'Switch on' : 'Switch off'}
          </button>
        </div>

        <div role="status" aria-live="polite" className="min-h-[3rem]">
          {feedback}
        </div>

        <p id={`${uid}-howto`} className="sr-only">
          Put it in the gap: drag it there, or press it. Press Escape to take it out.
        </p>
        <div role="group" aria-label="Objects" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {config.items.map((item) => {
            const placed = state.inGap === item.id;
            const tested = testAll && state.tested.includes(item.id);
            const dragged = drag?.id === item.id;
            return (
              <button
                key={item.id}
                ref={registerCard(item.id)}
                type="button"
                aria-pressed={placed}
                aria-describedby={`${uid}-howto`}
                onClick={() => onCardClick(item.id)}
                onPointerDown={(e) => onCardPointerDown(e, item.id)}
                onPointerMove={onCardPointerMove}
                onPointerUp={onCardPointerUp}
                onPointerCancel={onCardPointerCancel}
                onLostPointerCapture={onCardPointerCancel}
                className={cn(
                  OBJECT_CARD,
                  'cursor-grab touch-none select-none active:cursor-grabbing',
                  animate && 'transition-[border-color,background-color,box-shadow,opacity] duration-150',
                  dragged
                    ? 'border-dashed border-primary/50 bg-primary-soft/40 opacity-50'
                    : placed
                      ? 'border-primary bg-primary-soft text-primary-strong shadow-soft ring-4 ring-primary/20'
                      : 'border-line bg-surface shadow-soft hover:border-primary/40',
                )}
              >
                <ObjectFace item={item} />
                {tested && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-success text-white ring-2 ring-surface">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="sr-only">, tested</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {testAll && <TestResults groups={groups} tested={testedCount} total={config.items.length} uid={uid} animate={animate} />}

        <p className="flex items-start justify-center gap-1.5 text-center text-xs font-semibold text-ink-muted">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          On-screen circuit only. Never touch wall sockets or mains electricity.
        </p>
      </div>

      <button
        type="button"
        className={cn(
          'btn btn-lg w-full sm:mx-auto sm:flex sm:w-auto sm:min-w-[14rem]',
          correct ? 'btn-primary' : 'btn-success aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:translate-y-0',
        )}
        aria-disabled={!correct}
        aria-describedby={!correct ? helpId : undefined}
        onClick={() => {
          setTooSoon(!correct);
          if (correct) dispatch({ type: 'next' });
        }}
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
          waitLabel
        )}
      </button>
      {!correct && !showHelp && (
        <span id={helpId} className="sr-only">
          {waitHelp}
        </span>
      )}

      {/* The card being dragged follows the pointer above everything else. */}
      {drag &&
        dragItem &&
        createPortal(
          <div ref={setGhost} className="pointer-events-none fixed left-0 top-0 z-[70]" style={{ width: drag.width || undefined }} aria-hidden="true">
            <div className={cn(OBJECT_CARD, 'w-full border-primary bg-surface text-ink shadow-float', overGap && 'ring-4 ring-primary/25', animate && '-rotate-2 scale-[1.03]')}>
              <ObjectFace item={dragItem} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Picture (or icon) and words of an object card. */
function ObjectFace({ item }: { item: CircuitItem }) {
  return (
    <>
      {item.art ? (
        <ObjectPicture art={item.art} size={40} className="-my-1 h-9 w-9 sm:h-10 sm:w-10" />
      ) : (
        item.icon && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary sm:h-8 sm:w-8 sm:rounded-xl">
            <Icon name={item.icon} width={17} height={17} />
          </span>
        )
      )}
      <span className="min-w-0 flex-1 break-words">{item.label}</span>
    </>
  );
}

function FeedbackLine({ tone, icon, children }: { tone: CircuitFeedback['tone']; icon: ReactNode; children: ReactNode }) {
  return (
    <p className={cn('flex items-start justify-center gap-2 text-center font-bold', tone === 'lit' ? 'text-reward-strong' : 'text-ink')}>
      {icon}
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** The one feedback line: what the bulb does and why, or a hint. */
function CircuitLine({ fb, animate }: { fb: CircuitFeedback; animate: boolean }) {
  const icon =
    fb.tone === 'lit' ? (
      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 fill-reward text-reward-strong" aria-hidden="true" />
    ) : fb.tone === 'off' ? (
      <LightbulbOff className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
    ) : fb.tone === 'hint' ? (
      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-reward-strong" aria-hidden="true" />
    ) : (
      <Hand className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
    );
  return (
    <div className={cn(animate && 'animate-fade-up')}>
      <FeedbackLine tone={fb.tone} icon={icon}>
        {fb.text}
        {fb.detail && (
          <>
            {' '}
            <span className={cn(fb.detail.kind === 'hint' ? 'text-reward-strong' : fb.detail.kind === 'success' ? 'text-success-strong' : 'font-semibold text-ink-soft')}>{fb.detail.text}</span>
          </>
        )}
      </FeedbackLine>
    </div>
  );
}

/** "test-all" rounds: what each tested object did, in two columns. */
function TestResults({
  groups,
  tested,
  total,
  uid,
  animate,
}: {
  groups: { conductors: CircuitItem[]; insulators: CircuitItem[] };
  tested: number;
  total: number;
  uid: string;
  animate: boolean;
}) {
  const columns = [
    { id: 'conductors', title: 'Lets electricity through (conductors)', items: groups.conductors, icon: <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />, chip: 'bg-reward-soft text-reward-strong' },
    { id: 'insulators', title: 'Does not (insulators)', items: groups.insulators, icon: <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />, chip: 'bg-canvas-sunken text-ink-soft' },
  ];
  return (
    <div className="rounded-3xl bg-canvas p-3">
      <p className="mb-2 text-center text-sm font-extrabold tabular-nums text-ink-soft">
        {tested} of {total} objects tested
      </p>
      <div className="grid grid-cols-2 gap-2">
        {columns.map((col) => (
          <div key={col.id} className="min-w-0 rounded-2xl bg-surface p-2.5">
            <h4 id={`${uid}-${col.id}`} className="flex items-start gap-1.5 text-xs font-extrabold leading-snug text-ink sm:text-sm">
              {col.icon}
              <span className="min-w-0">{col.title}</span>
            </h4>
            <ul aria-labelledby={`${uid}-${col.id}`} className="mt-2 flex flex-wrap gap-1">
              {col.items.map((item) => (
                <li
                  key={item.id}
                  className={cn('flex max-w-full items-center gap-1 break-words rounded-lg py-0.5 text-xs font-bold sm:text-sm', item.art ? 'px-1.5' : 'px-2', col.chip, animate && 'animate-pop-in')}
                >
                  {item.art && <ObjectPicture art={item.art} size={20} />}
                  {item.label}
                </li>
              ))}
            </ul>
            {col.items.length === 0 && <p className="mt-1 text-xs font-semibold text-ink-muted">None yet</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The circuit drawing. Physics stays honest: the bulb glows only when `lit` (switch on + a conductor in the gap). */
function CircuitPicture({
  label,
  switchOn,
  lit,
  object,
  overGap,
  dragging,
  animate,
  gapRef,
}: {
  label: string;
  switchOn: boolean;
  lit: boolean;
  object: CircuitItem | undefined;
  overGap: boolean;
  dragging: boolean;
  animate: boolean;
  gapRef: Ref<SVGRectElement>;
}) {
  const wire = lit ? '#E39B0B' : '#46437A';
  // The clips grip the ends of the object in the gap, so a long name is never hidden behind them.
  // The object's picture sits just before its name.
  const picture = object?.art ? GAP_PICTURE + 4 : 0;
  const textWidth = object ? Math.min(object.label.length * LABEL_CHAR, 2 * (GAP_MAX_HALF - 10) - picture) : 0;
  const half = object ? Math.min(GAP_MAX_HALF, Math.max((GAP.right - GAP.left) / 2, (picture + textWidth) / 2 + 14)) : (GAP.right - GAP.left) / 2;
  const jawL = BULB.x - half;
  const jawR = BULB.x + half;
  const contentLeft = BULB.x - (picture + textWidth) / 2;
  return (
    <svg viewBox="0 -6 360 204" className="mx-auto h-auto w-full max-w-md" role="img" aria-label={label}>
      {/* Wires */}
      <g fill="none" stroke={wire} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${LEFT} 84 L ${LEFT} ${TOP} L ${BULB.x - 10} ${TOP}`} />
        <path d={`M ${BULB.x + 10} ${TOP} L ${RIGHT} ${TOP} L ${RIGHT} ${SWITCH.top}`} />
        <path d={`M ${RIGHT} ${SWITCH.bottom} L ${RIGHT} ${BOTTOM} L ${jawR + 12} ${BOTTOM}`} />
        <path d={`M ${jawL - 12} ${BOTTOM} L ${LEFT} ${BOTTOM} L ${LEFT} 146`} />
      </g>

      {/* Cell (battery) with + and − */}
      <rect x={LEFT - 6} y="84" width="12" height="7" rx="2" fill="#8B8FA8" />
      <rect x={LEFT - 14} y="90" width="28" height="56" rx="6" fill="#2E2A6B" />
      <rect x={LEFT - 14} y="90" width="28" height="18" rx="6" fill="#F2A516" />
      <text x={LEFT + 26} y="102" className="font-display" fontSize="20" fontWeight="700" fill="#1D1A4A">
        +
      </text>
      <text x={LEFT + 26} y="146" className="font-display" fontSize="22" fontWeight="700" fill="#1D1A4A">
        −
      </text>
      <text x={LEFT + 26} y="125" fontSize="11" fontWeight="700" fill="#69668E">
        cell
      </text>

      {/* Bulb */}
      {lit && (
        <g>
          <circle cx={BULB.x} cy={BULB.y} r="36" fill="#FFD84D" opacity="0.45" className={cn(animate && 'animate-pulse')} />
          <g stroke="#F2A516" strokeWidth="3" strokeLinecap="round">
            {[-150, -120, -90, -60, -30, 0, 180].map((deg) => {
              const a = (deg * Math.PI) / 180;
              return <line key={deg} x1={BULB.x + 28 * Math.cos(a)} y1={BULB.y + 28 * Math.sin(a)} x2={BULB.x + 36 * Math.cos(a)} y2={BULB.y + 36 * Math.sin(a)} />;
            })}
          </g>
        </g>
      )}
      <circle cx={BULB.x} cy={BULB.y} r="22" fill={lit ? '#FFE680' : '#F4F1EA'} stroke={lit ? '#F2A516' : '#B9B6CC'} strokeWidth="2.5" />
      <g fill="none" stroke={lit ? '#E8590C' : '#6B6F8C'} strokeWidth={lit ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${BULB.x - 6} 54 L ${BULB.x - 6} 38`} />
        <path d={`M ${BULB.x + 6} 54 L ${BULB.x + 6} 38`} />
        <path d={`M ${BULB.x - 6} 38 l 2 -5 l 2 5 l 2 -5 l 2 5 l 2 -5 l 2 5`} />
      </g>
      <rect x={BULB.x - 10} y="52" width="20" height="15" rx="3" fill="#8B8FA8" />
      <path d={`M ${BULB.x - 10} 57 h 20 M ${BULB.x - 10} 62 h 20`} stroke="#6B6F8C" strokeWidth="1.5" />

      {/* Switch: the lever closes onto the top contact when it is on */}
      <text x={RIGHT - 12} y="122" textAnchor="end" fontSize="11" fontWeight="700" fill="#69668E">
        switch
      </text>
      <g style={{ transform: `rotate(${switchOn ? 0 : 32}deg)`, transformOrigin: `${SWITCH.x}px ${SWITCH.bottom}px`, transition: animate ? 'transform 200ms ease-out' : 'none' }}>
        <line x1={SWITCH.x} y1={SWITCH.bottom} x2={SWITCH.x} y2={SWITCH.top} stroke="#5847E0" strokeWidth="5" strokeLinecap="round" />
      </g>
      <circle cx={SWITCH.x} cy={SWITCH.top} r="5.5" fill="#FFFFFF" stroke="#1D1A4A" strokeWidth="2.5" />
      <circle cx={SWITCH.x} cy={SWITCH.bottom} r="5.5" fill="#FFFFFF" stroke="#1D1A4A" strokeWidth="2.5" />

      {/* The gap: two clips with room for one object */}
      {object ? (
        <g>
          <rect x={jawL} y={BOTTOM - 15} width={jawR - jawL} height="30" rx="10" fill={overGap ? '#ECE9FF' : '#FFFFFF'} stroke="#5847E0" strokeWidth={overGap ? 3.5 : 2.5} />
          {object.art && <ObjectPicture art={object.art} size={GAP_PICTURE} x={contentLeft} y={BOTTOM - GAP_PICTURE / 2} />}
          <text x={contentLeft + picture + textWidth / 2} y={BOTTOM + 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="#1D1A4A">
            {object.label}
          </text>
        </g>
      ) : (
        <g>
          <rect
            x={GAP.left}
            y={BOTTOM - 15}
            width={GAP.right - GAP.left}
            height="30"
            rx="10"
            fill={overGap ? '#ECE9FF' : dragging ? '#F6F4FF' : 'transparent'}
            stroke={overGap ? '#5847E0' : '#9A90F0'}
            strokeWidth="2"
            strokeDasharray={overGap ? undefined : '6 5'}
          />
          <text x={BULB.x} y={BOTTOM + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#6B60D8">
            gap
          </text>
        </g>
      )}
      <g>
        <rect x={jawL - 26} y={BOTTOM - 7} width="20" height="14" rx="3" fill="#F06A4D" />
        <path d={`M ${jawL - 6} ${BOTTOM - 7} L ${jawL + 4} ${BOTTOM - 3} L ${jawL - 6} ${BOTTOM} L ${jawL + 4} ${BOTTOM + 3} L ${jawL - 6} ${BOTTOM + 7} Z`} fill="#B04028" />
        <rect x={jawR + 6} y={BOTTOM - 7} width="20" height="14" rx="3" fill="#1D1A4A" />
        <path d={`M ${jawR + 6} ${BOTTOM - 7} L ${jawR - 4} ${BOTTOM - 3} L ${jawR + 6} ${BOTTOM} L ${jawR - 4} ${BOTTOM + 3} L ${jawR + 6} ${BOTTOM + 7} Z`} fill="#46437A" />
      </g>
      {/* Drop zone for dragged objects: a little bigger than the gap itself. */}
      <rect ref={gapRef} data-drop-zone="gap" x={GAP.left - 30} y={BOTTOM - 26} width={GAP.right - GAP.left + 60} height="52" fill="transparent" pointerEvents="none" />
    </svg>
  );
}
