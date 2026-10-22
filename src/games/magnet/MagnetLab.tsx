import { ArrowLeft, ArrowRight, Check, ChevronDown, Hand, Info, Lightbulb, Magnet, RefreshCw, RotateCcw, Trophy, X } from 'lucide-react';
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
import type { MagnetLabConfig, MagnetPole } from '../../domain/types';
import { useSound } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { beginPointerDrag, type MiniGameProps } from '../framework';
// Pointer geometry shared with the other drag games (pure helpers, unit tested in match/dragMath.test.ts).
import { dropTargetAt, ghostTransform, grabOffset, passedDragThreshold, toBox, type Point } from '../match/dragMath';
import { BarMagnet, HorseshoeMagnet } from './MagnetArt';
import {
  FIXED_FACING,
  createMagnetReducer,
  currentRound,
  findObject,
  hintVisible,
  initialMagnetState,
  magnetFeedback,
  magnetResult,
  mistakeNudge,
  observationText,
  polesHidden,
  otherPole,
  roundObjects,
  testedGroups,
  trayFor,
  type MagnetFeedback,
  type MagnetHappening,
  type MagnetObject,
  type Tray,
} from './magnetLogic';

const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';
/** Objects speed up as they get closer to a magnet, because the pull gets stronger. */
const EASE_IN = 'cubic-bezier(.55,0,.85,.35)';

/** Object cards (and their drag ghost). */
const OBJECT_CARD =
  'relative flex min-h-[60px] w-full min-w-0 items-center gap-2 rounded-2xl border-2 px-2 py-1.5 text-left font-display text-[0.92rem] font-semibold leading-tight sm:text-base';

/* Workbench scene (viewBox 320 × 180): the horseshoe magnet on the right with its poles facing left. */
const MAGNET_AT = { x: 196, y: 30 };
const TEST_SPOT = { x: 82, y: 58 };
const TOUCHING = { x: 160, y: 58 };
const PULL_DISTANCE = TOUCHING.x - TEST_SPOT.x;

/* Pole track (viewBox 360 × 110): the fixed magnet on the left with N facing right. */
const BAR_WIDTH = 140;
const FIXED_X = 14;
const MOVING_REST_X = 206;
const MOVING_TOUCH_X = FIXED_X + BAR_WIDTH;
const BAR_Y = 34;

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
 * Magnet Explorer: a workbench experiment. Test rounds: drag an object to the
 * magnet (or tap it) and see whether it is pulled. Sort rounds: put each object
 * in the Magnetic or Not magnetic tray. Pole rounds: push a bar magnet towards
 * another one, turning it around to see attraction and repulsion.
 * Keyboard: every object, tray and control is a button; Escape takes an object off the magnet.
 */
export default function MagnetLab({ config, reducedMotion, onEvent, onRecord, onComplete, onRestart }: MiniGameProps<MagnetLabConfig>) {
  const reducer = useMemo(() => createMagnetReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, config, initialMagnetState);
  const [tooSoon, setTooSoon] = useState(false);
  const [showResults, setShowResults] = useState(false);
  /** Sort rounds: the object picked up by a tap, waiting for a tray. */
  const [picked, setPicked] = useState<string | null>(null);
  const play = useSound();
  const uid = useId().replace(/:/g, '');
  const animate = !reducedMotion;
  const round = currentRound(config, state);

  const callbacks = useRef({ onEvent, onRecord, onComplete });
  useEffect(() => {
    callbacks.current = { onEvent, onRecord, onComplete };
  }, [onEvent, onRecord, onComplete]);

  useEffect(() => {
    callbacks.current.onEvent({ key: 'start' });
  }, []);

  /* ------------------------------------------ events, sounds and completion */
  const seen = useRef(state.last);
  useEffect(() => {
    const last = state.last;
    if (!last || last === seen.current) return;
    seen.current = last;
    const now = config.rounds[state.round];
    const send = callbacks.current.onEvent;
    // The round as it was when this happened (a solved mystery round may already be marked correct).
    const hidden = now.kind === 'poles' && now.goal === 'identify' && !(last.kind === 'identified' && last.correct);
    const observation = observationText(config, last, hidden);
    if (observation) callbacks.current.onRecord?.({ kind: 'observation', text: observation });
    const solved = 'solved' in last && last.solved;
    switch (last.kind) {
      case 'tested': {
        const object = findObject(config, last.objectId);
        if (object) send({ key: last.pulled ? 'pulled' : 'not-pulled', vars: { object: object.label, explanation: object.explanation } });
        play(last.pulled ? 'snap' : 'tap');
        break;
      }
      case 'sorted': {
        const object = findObject(config, last.objectId);
        if (!last.correct) {
          play('incorrect');
          send({ key: 'sort-incorrect', vars: { object: object?.label ?? '', hint: mistakeNudge(config, state) } });
        } else if (!solved) {
          play('correct');
          if (object) send({ key: 'sort-correct', vars: { object: object.label, explanation: object.explanation } });
        }
        break;
      }
      case 'pushed':
        play(last.outcome === 'attract' ? 'snap' : 'whoosh');
        if (last.mistake) {
          play('incorrect');
          send({ key: 'round-incorrect', vars: { hint: mistakeNudge(config, state) } });
        } else if (!solved) send({ key: hidden ? `${last.outcome}:mystery` : last.outcome });
        break;
      case 'turned':
        play('tap');
        send({ key: 'turned' });
        break;
      case 'identified':
        if (!last.correct) {
          play('incorrect');
          send({ key: 'round-incorrect', vars: { hint: mistakeNudge(config, state) } });
        }
        break;
      case 'hint':
        send({ key: 'hint', vars: { hint: now.hint } });
        break;
    }
    if (solved) {
      play('correct');
      send({ key: 'round-correct', vars: { explanation: now.explanation } });
    }
  }, [state, config, play]);

  const reported = useRef(false);
  useEffect(() => {
    if (state.phase !== 'complete' || reported.current) return;
    reported.current = true;
    const result = magnetResult(config, state);
    play('reward');
    callbacks.current.onEvent({ key: result.perfect ? 'complete:perfect' : 'complete' });
    callbacks.current.onComplete(result);
  }, [state, config, play]);

  // Focus follows the game: each new round's task, then the summary.
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

  /* ------------------------------------------------------------- actions */
  const testObject = (id: string) => {
    setTooSoon(false);
    dispatch({ type: 'test', objectId: id });
  };
  const takeOff = () => {
    if (state.atMagnet === null) return;
    play('tap');
    dispatch({ type: 'release' });
  };
  const sortInto = (id: string, tray: Tray) => {
    setTooSoon(false);
    // After a wrong tray the object stays picked up, so the other tray is one tap away.
    const object = findObject(config, id);
    if (object && trayFor(object) === tray) setPicked(null);
    else setPicked(id);
    dispatch({ type: 'sort', objectId: id, tray });
  };

  /* ------------------------------------------------------- drag and drop */
  const cardEls = useRef(new Map<string, HTMLButtonElement>());
  const magnetZone = useRef<SVGRectElement>(null);
  const magneticTray = useRef<HTMLButtonElement>(null);
  const otherTray = useRef<HTMLButtonElement>(null);
  const press = useRef<Press | null>(null);
  const pointer = useRef<Point>({ x: 0, y: 0 });
  const ghost = useRef<HTMLDivElement | null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{ id: string; width: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const setGhost = useCallback((el: HTMLDivElement | null) => {
    ghost.current = el;
    if (el && press.current) el.style.transform = ghostTransform(pointer.current, press.current.offset);
  }, []);

  const zoneAt = (p: Point) => {
    const zones: [string, Element | null][] = [
      ['magnet', magnetZone.current],
      ['magnetic', magneticTray.current],
      ['not-magnetic', otherTray.current],
    ];
    const boxes = zones.filter((z): z is [string, Element] => z[1] !== null).map(([id, el]) => toBox(id, el.getBoundingClientRect()));
    return dropTargetAt(p, boxes, 28);
  };

  const endDrag = () => {
    press.current = null;
    setDrag(null);
    setOver(null);
  };

  const flyBack = (pr: Press) => {
    pr.returning = true;
    setOver(null);
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

  const drop = (id: string, zone: string) => {
    if (zone === 'magnet') testObject(id);
    else if (zone === 'magnetic' || zone === 'not-magnetic') sortInto(id, zone);
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
    setOver(zoneAt(pointer.current));
  };

  const onCardPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.pointerId !== e.pointerId || pr.returning) return;
    if (!pr.dragging) {
      press.current = null;
      return;
    }
    suppressClick.current = true;
    pointer.current = { x: e.clientX, y: e.clientY };
    const zone = zoneAt(pointer.current);
    if (!zone) return flyBack(pr);
    endDrag();
    drop(pr.id, zone);
  };

  const onCardPointerCancel = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.pointerId !== e.pointerId || pr.returning) return;
    if (pr.dragging) flyBack(pr);
    else press.current = null;
  };

  const onCardClick = (id: string) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (round.kind === 'test') {
      if (state.atMagnet === id) takeOff();
      else testObject(id);
    } else if (round.kind === 'sort') {
      play('tap');
      setPicked((p) => (p === id ? null : id));
    }
  };

  const onPlayKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (e.key !== 'Escape') return;
    if (round.kind === 'test' && state.atMagnet !== null) {
      e.preventDefault();
      takeOff();
    } else if (picked) {
      e.preventDefault();
      setPicked(null);
    }
  };

  const registerCard = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) cardEls.current.set(id, el);
    else cardEls.current.delete(id);
  };

  /* ---------------------------------------------------------- the finish */
  if (state.phase === 'complete') {
    const result = magnetResult(config, state);
    const learned = [...new Set(config.rounds.map((r) => r.explanation))];
    return (
      <div className={cn('card p-5 sm:p-6', animate && 'animate-pop-in')}>
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
            <Trophy className="h-8 w-8" aria-hidden="true" />
          </div>
          <h3 ref={doneRef} tabIndex={-1} className="font-display text-2xl font-semibold focus:outline-none">
            Magnet Explorer complete!
          </h3>
          <p className="mt-1 text-ink-soft">{result.perfect ? 'Every round right on the first try. Perfect!' : `${result.correct} of ${result.total} rounds right on the first try.`}</p>
        </div>
        <section aria-label="What you discovered" className="mt-4 rounded-3xl bg-canvas p-4">
          <p className="font-extrabold">What you discovered</p>
          <ul className="mt-2 space-y-1.5">
            {learned.map((line) => (
              <li key={line} className="flex items-start gap-2 text-[0.95rem]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </section>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button type="button" className="btn btn-secondary btn-sm min-h-[44px]" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Play again
          </button>
          {config.objects.length > 0 && config.rounds.some((r) => r.kind !== 'poles') && (
            <button
              type="button"
              className="btn btn-ghost btn-sm min-h-[44px] px-3"
              aria-expanded={showResults}
              aria-controls={`${uid}-results`}
              onClick={() => setShowResults((open) => !open)}
            >
              Every object <ChevronDown className={cn('h-4 w-4', animate && 'transition-transform', showResults && 'rotate-180')} aria-hidden="true" />
            </button>
          )}
        </div>
        <ul id={`${uid}-results`} hidden={!showResults} aria-label="Every object" className="mt-4 space-y-2">
          {config.objects.map((o) => (
            <li key={o.id} className="flex items-start gap-2.5 rounded-2xl bg-canvas px-3 py-2.5 text-sm">
              <ObjectPicture art={o.art} size={32} />
              <span className="min-w-0">
                <span className="font-bold">
                  {o.label}: {o.magnetic ? 'magnetic' : 'not magnetic'}.
                </span>{' '}
                {o.explanation}
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
  const objects = roundObjects(config, round);
  const dragObject = drag ? findObject(config, drag.id) : undefined;
  const showHint = hintVisible(state);
  const helpId = `${uid}-help`;
  const showHelp = tooSoon && !correct;
  const waitLabel =
    round.kind === 'test' ? 'Test every object to continue' : round.kind === 'sort' ? 'Sort every object to continue' : round.goal === 'explore' ? 'See both results to continue' : 'Solve the challenge to continue';
  const waitHelp =
    round.kind === 'test'
      ? `Bring each object to the magnet. ${state.tested.length} of ${objects.length} tested.`
      : round.kind === 'sort'
        ? `Put each object in a tray. ${Object.keys(state.sorted).length} of ${objects.length} sorted.`
        : round.goal === 'explore'
          ? 'Push the magnets together, then turn the moving magnet around and push again.'
          : round.goal === 'identify'
            ? 'Push the mystery magnet towards the N pole, watch, then choose N or S.'
            : 'Push the magnets together. Turn the moving magnet around if it does the opposite.';

  let feedback: ReactNode = null;
  if (drag) {
    feedback = (
      <FeedbackRow tone="info" icon={<Hand className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}>
        {round.kind === 'test' ? (over === 'magnet' ? 'Let go near the magnet.' : 'Bring it close to the magnet.') : over ? `Let go to put it in ${over === 'magnetic' ? 'Magnetic' : 'Not magnetic'}.` : 'Drop it in a tray.'}
      </FeedbackRow>
    );
  } else if (showHelp) {
    feedback = (
      <p id={helpId} className="text-center font-bold text-ink-soft">
        {waitHelp}
      </p>
    );
  } else {
    const fb = magnetFeedback(config, state);
    if (fb) feedback = <FeedbackLine key={`${fb.text}|${fb.detail ?? ''}|${state.mistakes}`} fb={fb} animate={animate} />;
    else if (round.kind === 'sort' && picked) {
      const o = findObject(config, picked);
      if (o) feedback = <FeedbackRow tone="info" icon={<Hand className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}>{`Now choose a tray for ${o.label.toLowerCase()}.`}</FeedbackRow>;
    }
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

      <div onKeyDown={onPlayKeyDown} className={cn('card space-y-4 p-3 sm:p-6', correct && 'ring-4 ring-success/30')}>
        {round.kind === 'test' && (
          <Workbench
            object={findObject(config, state.atMagnet)}
            testCount={state.tested.length}
            last={state.last}
            dragging={Boolean(drag)}
            over={over === 'magnet'}
            animate={animate}
            zoneRef={magnetZone}
          />
        )}
        {round.kind === 'poles' && (
          <PoleTrack
            facing={state.facing}
            together={state.joined}
            hidden={polesHidden(round, state)}
            last={state.last}
            animate={animate}
            onPush={() => {
              setTooSoon(false);
              dispatch({ type: 'push' });
            }}
          />
        )}

        <div role="status" aria-live="polite" className="min-h-[3rem]">
          {feedback}
        </div>

        {round.kind === 'poles' ? (
          <PoleControls
            goal={round.goal}
            seen={state.seen}
            canAnswer={state.pushedSinceTurn && !correct}
            onTurn={() => {
              setTooSoon(false);
              dispatch({ type: 'turn' });
            }}
            onPush={() => {
              setTooSoon(false);
              dispatch({ type: 'push' });
            }}
            onAnswer={(answer) => dispatch({ type: 'identify', answer })}
          />
        ) : (
          <>
            <p id={`${uid}-howto`} className="sr-only">
              {round.kind === 'test' ? 'Drag it to the magnet, or press it to test it. Press Escape to take it off the magnet.' : 'Drag it into a tray, or press it and then press a tray.'}
            </p>
            <div role="group" aria-label="Objects" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {objects.map((o) => {
                const isSorted = round.kind === 'sort' && Boolean(state.sorted[o.id]);
                if (isSorted) return null;
                const selected = round.kind === 'test' ? state.atMagnet === o.id : picked === o.id;
                const tested = round.kind === 'test' && state.tested.includes(o.id);
                const dragged = drag?.id === o.id;
                return (
                  <button
                    key={o.id}
                    ref={registerCard(o.id)}
                    type="button"
                    aria-pressed={selected}
                    aria-describedby={`${uid}-howto`}
                    onClick={() => onCardClick(o.id)}
                    onPointerDown={(e) => onCardPointerDown(e, o.id)}
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
                        : selected
                          ? 'border-primary bg-primary-soft text-primary-strong shadow-soft ring-4 ring-primary/20'
                          : 'border-line bg-surface shadow-soft hover:border-primary/40',
                    )}
                  >
                    <ObjectPicture art={o.art} size={40} />
                    <span className="min-w-0 flex-1 break-words">{o.label}</span>
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
            {round.kind === 'test' && <Notebook groups={testedGroups(config, state)} tested={state.tested.length} total={objects.length} uid={uid} animate={animate} />}
            {round.kind === 'sort' && (
              <Trays
                config={config}
                sorted={state.sorted}
                over={over}
                picked={picked}
                shake={state.last?.kind === 'sorted' && !state.last.correct ? state.last : null}
                animate={animate}
                trayRefs={{ magnetic: magneticTray, 'not-magnetic': otherTray }}
                onChoose={(tray) => (picked ? sortInto(picked, tray) : setTooSoon(true))}
              />
            )}
          </>
        )}

        {showHint ? (
          <p className={cn('flex items-start gap-2 rounded-2xl bg-reward-soft px-3 py-2.5 text-[0.95rem] font-semibold text-ink', animate && 'animate-fade-up')}>
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-reward-strong" aria-hidden="true" />
            <span>
              <span className="sr-only">Hint: </span>
              {round.hint}
            </span>
          </p>
        ) : (
          !correct && (
            <div className="flex justify-center">
              <button type="button" className="btn btn-ghost btn-sm min-h-[44px]" onClick={() => dispatch({ type: 'hint' })}>
                <Lightbulb className="h-4 w-4 text-reward" aria-hidden="true" /> Need a hint?
              </button>
            </div>
          )
        )}

        <p className="flex items-start justify-center gap-1.5 text-center text-xs font-semibold text-ink-muted">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          A simplified model. Real magnets get weaker with distance, and some steels (like many steel spoons) are not magnetic.
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
          if (correct) {
            setPicked(null);
            dispatch({ type: 'next' });
          }
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

      {drag &&
        dragObject &&
        createPortal(
          <div ref={setGhost} className="pointer-events-none fixed left-0 top-0 z-[70]" style={{ width: drag.width || undefined }} aria-hidden="true">
            <div className={cn(OBJECT_CARD, 'w-full border-primary bg-surface text-ink shadow-float', over && 'ring-4 ring-primary/25', animate && '-rotate-2 scale-[1.03]')}>
              <ObjectPicture art={dragObject.art} size={40} />
              <span className="min-w-0 flex-1 break-words">{dragObject.label}</span>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ------------------------------------------------------------------ parts */

function FeedbackRow({ tone, icon, children }: { tone: MagnetFeedback['tone']; icon: ReactNode; children: ReactNode }) {
  return (
    <p className={cn('flex items-start justify-center gap-2 text-center font-bold', tone === 'pulled' || tone === 'attract' || tone === 'right' ? 'text-success-strong' : 'text-ink')}>
      {icon}
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function FeedbackLine({ fb, animate }: { fb: MagnetFeedback; animate: boolean }) {
  const icon =
    fb.tone === 'pulled' || fb.tone === 'attract' ? (
      <Magnet className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
    ) : fb.tone === 'repel' ? (
      <ArrowLeft className="mt-0.5 h-5 w-5 shrink-0 rotate-180 text-coral" aria-hidden="true" />
    ) : fb.tone === 'right' ? (
      <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
    ) : fb.tone === 'wrong' ? (
      <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-reward-strong" aria-hidden="true" />
    ) : fb.tone === 'not-pulled' ? (
      <X className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
    ) : (
      <Hand className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
    );
  return (
    <div className={cn(animate && 'animate-fade-up')}>
      <FeedbackRow tone={fb.tone} icon={icon}>
        {fb.text}
        {fb.detail && (
          <>
            {' '}
            <span className="font-semibold text-ink-soft">{fb.detail}</span>
          </>
        )}
      </FeedbackRow>
    </div>
  );
}

/** The workbench: the horseshoe magnet and the object being tested. Magnetic objects slide across the gap and stick. */
function Workbench({
  object,
  testCount,
  last,
  dragging,
  over,
  animate,
  zoneRef,
}: {
  object: MagnetObject | undefined;
  testCount: number;
  last: MagnetHappening | null;
  dragging: boolean;
  over: boolean;
  animate: boolean;
  zoneRef: Ref<SVGRectElement>;
}) {
  const pulled = Boolean(object?.magnetic);
  const objectRef = useRef<SVGGElement>(null);
  // Each new test plays once: a magnetic object waits at the test spot, then speeds into the magnet.
  useEffect(() => {
    if (!animate || last?.kind !== 'tested') return;
    const el = objectRef.current;
    if (last.pulled) {
      animateEl(
        el,
        [
          { transform: `translate(${-PULL_DISTANCE}px, -6px)` },
          { transform: `translate(${-PULL_DISTANCE}px, 0px)`, offset: 0.3 },
          { transform: 'translate(0px, 0px)' },
        ],
        { duration: 650, easing: EASE_IN },
      );
    } else {
      animateEl(el, [{ transform: 'translate(0px, -10px)' }, { transform: 'translate(0px, 0px)' }], { duration: 260, easing: EASE_OUT });
    }
  }, [last, animate]);

  const spot = pulled ? TOUCHING : TEST_SPOT;
  const label = object
    ? `Workbench with a horseshoe magnet. ${object.label} is next to the magnet. ${pulled ? 'The magnet pulled it and it is stuck to the magnet.' : 'The magnet does not pull it.'}`
    : `Workbench with a horseshoe magnet. Bring an object close to the magnet to test it. ${testCount} tested so far.`;
  return (
    <svg viewBox="0 0 320 180" className="mx-auto h-auto w-full max-w-xl touch-none select-none" role="img" aria-label={label}>
      <defs>
        <linearGradient id="magnet-bench-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E8C08A" />
          <stop offset="1" stopColor="#CF9A5C" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="180" rx="18" fill="url(#magnet-bench-wood)" />
      <g stroke="#B57E43" strokeWidth="1.2" opacity="0.55" fill="none">
        <path d="M0 45 H320 M0 90 H320 M0 135 H320" />
        <path d="M30 20 q40 -6 80 2 M150 64 q50 -8 110 4 M20 112 q60 8 120 -2 M180 156 q40 -6 100 2" opacity="0.7" />
      </g>
      {/* Where to bring objects */}
      <circle
        cx={TEST_SPOT.x + 32}
        cy={TEST_SPOT.y + 32}
        r="38"
        fill={over ? '#ECE9FF' : dragging ? '#F6F4FF' : '#FFFFFF'}
        fillOpacity={over || dragging ? 0.9 : 0.35}
        stroke={over ? '#5847E0' : '#FFFFFF'}
        strokeWidth={over ? 3 : 2}
        strokeDasharray={over ? undefined : '6 5'}
      />
      {!object && (
        <text x={TEST_SPOT.x + 32} y={TEST_SPOT.y + 36} textAnchor="middle" fontSize="11" fontWeight="800" fill="#7A4F1F">
          Bring it here
        </text>
      )}
      <HorseshoeMagnet x={MAGNET_AT.x} y={MAGNET_AT.y} glow={pulled} />
      {object && (
        <g key={`${object.id}-${testCount}`} ref={objectRef}>
          <ObjectPicture art={object.art} size={64} x={spot.x} y={spot.y} />
        </g>
      )}
      <rect ref={zoneRef} data-drop-zone="magnet" x="20" y="10" width="300" height="160" fill="transparent" pointerEvents="none" />
    </svg>
  );
}

/** Test rounds: what each tested object did. */
function Notebook({ groups, tested, total, uid, animate }: { groups: { pulled: MagnetObject[]; notPulled: MagnetObject[] }; tested: number; total: number; uid: string; animate: boolean }) {
  const columns = [
    { id: 'pulled', title: 'Pulled by the magnet', items: groups.pulled, chip: 'bg-success-soft text-success-strong' },
    { id: 'not-pulled', title: 'Not pulled', items: groups.notPulled, chip: 'bg-canvas-sunken text-ink-soft' },
  ];
  return (
    <div className="rounded-3xl bg-canvas p-3">
      <p className="mb-2 text-center text-sm font-extrabold tabular-nums text-ink-soft">
        {tested} of {total} objects tested
      </p>
      <div className="grid grid-cols-2 gap-2">
        {columns.map((col) => (
          <div key={col.id} className="min-w-0 rounded-2xl bg-surface p-2.5">
            <h4 id={`${uid}-${col.id}`} className="text-xs font-extrabold leading-snug text-ink sm:text-sm">
              {col.title}
            </h4>
            <ul aria-labelledby={`${uid}-${col.id}`} className="mt-2 flex flex-wrap gap-1">
              {col.items.map((o) => (
                <li key={o.id} className={cn('flex max-w-full items-center gap-1 break-words rounded-lg px-1.5 py-0.5 text-xs font-bold sm:text-sm', col.chip, animate && 'animate-pop-in')}>
                  <ObjectPicture art={o.art} size={20} />
                  {o.label}
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

/** Sort rounds: two trays. Tap one after picking an object, or drop an object on it. */
function Trays({
  config,
  sorted,
  over,
  picked,
  shake,
  animate,
  trayRefs,
  onChoose,
}: {
  config: MagnetLabConfig;
  sorted: Record<string, Tray>;
  over: string | null;
  picked: string | null;
  shake: { tray: Tray } | null;
  animate: boolean;
  trayRefs: Record<Tray, Ref<HTMLButtonElement>>;
  onChoose: (tray: Tray) => void;
}) {
  const trays: { id: Tray; title: string; sub: string }[] = [
    { id: 'magnetic', title: 'Magnetic', sub: 'A magnet pulls it' },
    { id: 'not-magnetic', title: 'Not magnetic', sub: 'A magnet does not pull it' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {trays.map((t) => {
        const inTray = Object.entries(sorted)
          .filter(([, tray]) => tray === t.id)
          .map(([id]) => findObject(config, id))
          .filter((o): o is MagnetObject => Boolean(o));
        const shaking = shake?.tray === t.id;
        return (
          <button
            key={t.id}
            ref={trayRefs[t.id]}
            type="button"
            onClick={() => onChoose(t.id)}
            aria-label={`${t.title} tray: ${t.sub}. ${inTray.length} object${inTray.length === 1 ? '' : 's'} in it.${picked ? '' : ' Pick an object first.'}`}
            className={cn(
              'flex min-h-[132px] min-w-0 flex-col items-stretch rounded-3xl border-2 border-dashed p-2.5 text-left',
              t.id === 'magnetic' ? 'bg-coral-soft/60' : 'bg-canvas',
              over === t.id || picked ? 'border-primary' : 'border-line-strong',
              over === t.id && 'ring-4 ring-primary/25',
              shaking && animate && 'animate-shake',
            )}
          >
            <span className="flex items-center gap-1.5 font-display text-base font-semibold sm:text-lg">
              {t.id === 'magnetic' ? <Magnet className="h-5 w-5 text-coral" aria-hidden="true" /> : <X className="h-5 w-5 text-ink-muted" aria-hidden="true" />}
              {t.title}
            </span>
            <span className="text-xs font-semibold text-ink-muted">{t.sub}</span>
            <span className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
              {inTray.map((o) => (
                <span key={o.id} className={cn('flex items-center gap-1 rounded-lg bg-surface px-1.5 py-0.5 text-xs font-bold shadow-soft', animate && 'animate-pop-in')}>
                  <ObjectPicture art={o.art} size={20} />
                  {o.label}
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Two bar magnets on a table. The right one moves: drag it left, or press Push. Labels hide for the mystery magnet. */
function PoleTrack({
  facing,
  together,
  hidden,
  last,
  animate,
  onPush,
}: {
  facing: MagnetPole;
  together: boolean;
  hidden: boolean;
  last: MagnetHappening | null;
  animate: boolean;
  onPush: () => void;
}) {
  const movingRef = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ pointerId: number; startX: number; scale: number; dx: number } | null>(null);
  const fromDrag = useRef(0);
  const wasTogether = useRef(together);
  const gap = MOVING_REST_X - MOVING_TOUCH_X;

  useEffect(() => {
    const el = movingRef.current;
    const start = fromDrag.current;
    const already = wasTogether.current;
    fromDrag.current = 0;
    wasTogether.current = together;
    if (el) el.style.transform = '';
    if (!animate || !last) return;
    if (last.kind === 'pushed') {
      // Pushing magnets that are already stuck together changes nothing.
      if (last.outcome === 'attract' && already) return;
      if (last.outcome === 'attract') {
        animateEl(el, [{ transform: `translateX(${gap + start}px)` }, { transform: 'translateX(0px)' }], { duration: 420, easing: EASE_IN });
      } else {
        animateEl(
          el,
          [{ transform: `translateX(${start}px)` }, { transform: `translateX(${Math.min(start, -20)}px)`, offset: 0.35 }, { transform: 'translateX(14px)', offset: 0.7 }, { transform: 'translateX(0px)' }],
          { duration: 700, easing: EASE_OUT },
        );
      }
    } else if (last.kind === 'turned') {
      animateEl(el, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0.04)' }, { transform: 'scaleX(1)' }], { duration: 320, easing: 'ease-in-out' });
    }
  }, [last, animate, gap, together]);

  const onPointerDown = (e: ReactPointerEvent<SVGGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    beginPointerDrag(e);
    const rect = svgRef.current?.getBoundingClientRect();
    drag.current = { pointerId: e.pointerId, startX: e.clientX, scale: rect && rect.width ? 360 / rect.width : 1, dx: 0 };
  };
  const onPointerMove = (e: ReactPointerEvent<SVGGElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    // Only towards the other magnet, and never through it.
    d.dx = Math.max(together ? 0 : -gap + 4, Math.min(0, (e.clientX - d.startX) * d.scale));
    if (movingRef.current) movingRef.current.style.transform = `translateX(${d.dx}px)`;
  };
  const onPointerEnd = (e: ReactPointerEvent<SVGGElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (d.dx < -14) {
      fromDrag.current = d.dx;
      onPush();
    } else if (movingRef.current) movingRef.current.style.transform = '';
  };

  const movingX = together ? MOVING_TOUCH_X : MOVING_REST_X;
  const label = `Two bar magnets on a table. The left magnet's north (N) pole faces the right magnet. ${
    hidden ? "The right magnet's poles are hidden." : `The right magnet's ${facing} pole faces it.`
  } ${together ? 'The magnets are stuck together.' : 'There is a gap between them.'} Drag the right magnet to the left to push them together.`;
  return (
    <svg ref={svgRef} viewBox="0 0 360 110" className="mx-auto h-auto w-full max-w-xl select-none" role="img" aria-label={label}>
      <defs>
        <linearGradient id="magnet-table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3E6D3" />
          <stop offset="1" stopColor="#E2CDAE" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="360" height="110" rx="18" fill="url(#magnet-table)" />
      <path d="M0 86 H360" stroke="#C9AD86" strokeWidth="1.5" />
      <g transform={`translate(${FIXED_X} ${BAR_Y}) scale(${BAR_WIDTH / 160})`}>
        <BarMagnet left={otherPole(FIXED_FACING)} right={FIXED_FACING} />
      </g>
      <g ref={movingRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} className="cursor-grab touch-none active:cursor-grabbing" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
        <g transform={`translate(${movingX} ${BAR_Y}) scale(${BAR_WIDTH / 160})`}>
          <BarMagnet left={facing} right={otherPole(facing)} hidden={hidden} />
        </g>
      </g>
      {!together && (
        <text x={(MOVING_TOUCH_X + MOVING_REST_X) / 2} y="26" textAnchor="middle" fontSize="11" fontWeight="800" fill="#8A6A3A">
          gap
        </text>
      )}
    </svg>
  );
}

function PoleControls({
  goal,
  seen,
  canAnswer,
  onTurn,
  onPush,
  onAnswer,
}: {
  goal: 'explore' | 'attract' | 'repel' | 'identify';
  seen: string[];
  canAnswer: boolean;
  onTurn: () => void;
  onPush: () => void;
  onAnswer: (pole: MagnetPole) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-primary min-h-[48px]" onClick={onPush}>
          <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Push together
        </button>
        <button type="button" className="btn btn-secondary min-h-[48px]" onClick={onTurn}>
          <RefreshCw className="h-5 w-5" aria-hidden="true" /> Turn it around
        </button>
      </div>
      {goal === 'explore' && (
        <ul className="flex justify-center gap-2" aria-label="Results seen">
          {(['attract', 'repel'] as const).map((o) => (
            <li key={o} className={cn('flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-extrabold', seen.includes(o) ? 'bg-success-soft text-success-strong' : 'bg-canvas-sunken text-ink-muted')}>
              {seen.includes(o) ? <Check className="h-4 w-4" aria-hidden="true" /> : <span className="h-4 w-4 rounded-full border-2 border-current" aria-hidden="true" />}
              {o === 'attract' ? 'Attract' : 'Repel'}
              <span className="sr-only">{seen.includes(o) ? ': seen' : ': not seen yet'}</span>
            </li>
          ))}
        </ul>
      )}
      {goal === 'identify' && (
        <div role="group" aria-label="Which pole of the mystery magnet faces the N pole?" className="rounded-3xl bg-canvas p-3 text-center">
          <p className="text-sm font-extrabold">Which pole of the mystery magnet faces the N pole?</p>
          {!canAnswer && <p className="text-xs font-semibold text-ink-muted">Push it first and watch what happens.</p>}
          <div className="mt-2 flex justify-center gap-2">
            {(['N', 'S'] as const).map((p) => (
              <button key={p} type="button" disabled={!canAnswer} className="btn btn-secondary min-h-[48px] min-w-[7rem] disabled:opacity-50" onClick={() => onAnswer(p)}>
                {p === 'N' ? 'North (N)' : 'South (S)'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
