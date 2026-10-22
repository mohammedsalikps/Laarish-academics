import { ArrowRight, Check, ChevronDown, FlaskConical, Hand, Lightbulb, Play, RotateCcw, Scale, Target, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { RAMP_HEIGHT_NAMES } from '../../../shared/mentor/scienceModels';
import { SurfacePatterns } from '../../components/art/Illustration';
import { ToyCar } from '../../components/art/ToyCar';
import { useSound } from '../../hooks/usePreferences';
import type { DistanceBand, FrictionChallenge, FrictionExperimentConfig, RampHeight, SurfaceDefinition } from '../../domain/types';
import { cn } from '../../lib/cn';
import { beginPointerDrag, type GameEvent, type MiniGameProps } from '../framework';
import {
  allChallengesSolved,
  comparison,
  createFrictionReducer,
  currentChallenge,
  initialFrictionState,
  isExperimentComplete,
  isFairComparison,
  isLabComplete,
  testedSurfaceIds,
  type FrictionGameState,
  type RunRecord,
} from './frictionGame';
import { BAND_LABELS, BAND_TITLES, formatMetres, positionAt, speedAt } from './simulation';

/* Scene geometry (SVG user units). */
const VIEW_W = 680;
const VIEW_H = 280;
const TRACK_Y = 196;
const TRACK_X0 = 124;
const RAMP_TOP: [number, number] = [26, 104];
const SLOW_MOTION = 1.5;
const RAMP_MS = 750;
const WHEEL_R = 8;

/** Where each start height sits along the ramp (0 = top, 1 = bottom). */
const HEIGHT_POS: Record<RampHeight, number> = { top: 0, middle: 0.5, low: 0.75 };
const HEIGHTS: RampHeight[] = ['low', 'middle', 'top'];
const PUSH_WORDS: Record<RampHeight, string> = { low: 'Gentle push', middle: 'Medium push', top: 'Big push' };

const BAND_STYLE: Record<DistanceBand, { fill: string; text: string }> = {
  short: { fill: '#FFE1D9', text: '#B04028' },
  medium: { fill: '#FFF0CC', text: '#9E6200' },
  far: { fill: '#DDF3E6', text: '#127045' },
};

const SURFACE_DOT: Record<SurfaceDefinition['texture'], string> = {
  wood: '#D9A066',
  grass: '#5BBF77',
  gravel: '#958A7C',
  carpet: '#B35C8A',
  ice: '#8ED1F5',
};

const rampPoint = (t: number): [number, number] => [RAMP_TOP[0] + (TRACK_X0 - RAMP_TOP[0]) * t, RAMP_TOP[1] + (TRACK_Y - RAMP_TOP[1]) * t];
const RAMP_ANGLE = (Math.atan2(TRACK_Y - RAMP_TOP[1], TRACK_X0 - RAMP_TOP[0]) * 180) / Math.PI;

/**
 * Friction Lab: one clear step at a time.
 * Explore: choose a surface → predict → Start → result (every explore run
 * uses the same push, so only the surface changes). After enough surfaces,
 * three challenges follow; the push control appears only in a challenge that
 * lets the child change it. One question at the end checks the idea itself.
 * Results and the model note stay folded away until asked for.
 */
export default function FrictionExperiment({ config, reducedMotion, onEvent, onRecord, onComplete }: MiniGameProps<FrictionExperimentConfig>) {
  const reducer = useMemo(() => createFrictionReducer(config), [config]);
  const [state, dispatch] = useReducer(reducer, initialFrictionState);
  const uid = useId().replace(/:/g, '');
  const play = useSound();
  const pxPerM = (VIEW_W - 30 - TRACK_X0) / config.trackLength;
  const trackX = (d: number) => TRACK_X0 + Math.min(d, config.trackLength) * pxPerM;
  const surfaceById = useMemo(() => new Map(config.surfaces.map((s) => [s.id, s])), [config.surfaces]);
  const surface = state.surfaceId ? surfaceById.get(state.surfaceId) : undefined;
  const challenge = currentChallenge(state, config);
  const challenges = useMemo(() => config.challenges ?? [], [config.challenges]);
  const choosing = state.phase === 'choose-surface' || state.phase === 'predict' || state.phase === 'ready';
  const pushVisible = Boolean(challenge && !challenge.height);
  const canDrag = choosing && pushVisible;
  const surfaceChangeable = !challenge || !challenge.surfaceId;
  const solvedAll = allChallengesSolved(state, config);
  const showCheck = Boolean(config.check && solvedAll && state.mode !== 'challenge');
  const labComplete = isLabComplete(state, config);
  const experimentDone = isExperimentComplete(state, config);
  const [showResults, setShowResults] = useState(false);
  const [changingSurface, setChangingSurface] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const carRef = useRef<SVGGElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);
  const completedOnce = useRef(false);
  const eventsRef = useRef({ onEvent, onRecord, onComplete });
  useEffect(() => {
    eventsRef.current = { onEvent, onRecord, onComplete };
  }, [onEvent, onRecord, onComplete]);

  useEffect(() => {
    eventsRef.current.onEvent({ key: 'start' });
  }, []);

  // A follow-up mentor line (sent a moment after a result) is dropped as soon as the child does something new,
  // so it can never replace the line for what they just did.
  const pendingLine = useRef<number | undefined>(undefined);
  const say = useCallback((event: GameEvent) => {
    window.clearTimeout(pendingLine.current);
    eventsRef.current.onEvent(event);
  }, []);
  const sayLater = useCallback((event: GameEvent) => {
    window.clearTimeout(pendingLine.current);
    pendingLine.current = window.setTimeout(() => eventsRef.current.onEvent(event), 2200);
  }, []);
  useEffect(() => () => window.clearTimeout(pendingLine.current), []);

  /* Places the car: on the ramp (0 = top, 1 = bottom) or on the track (distance in m). */
  const placeCar = (mode: 'ramp' | 'track', value: number, wheelDeg: number) => {
    const g = carRef.current;
    if (!g) return;
    let x: number;
    let y: number;
    let angle = 0;
    if (mode === 'ramp') {
      [x, y] = rampPoint(value);
      angle = RAMP_ANGLE;
    } else {
      x = trackX(value);
      y = TRACK_Y;
    }
    g.setAttribute('transform', `translate(${x - 32} ${y}) rotate(${angle} 32 0)`);
    g.querySelectorAll<SVGGElement>('.wheel').forEach((w) => (w.style.transform = `rotate(${wheelDeg}deg)`));
  };

  // Park the car at its start height whenever we are not mid-run or showing a result.
  useEffect(() => {
    if (choosing && !dragging.current) placeCar('ramp', HEIGHT_POS[state.height], 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.height]);

  // Run animation.
  useEffect(() => {
    if (state.phase !== 'running' || !state.current || !surface) return;
    const run = state.current;
    const mu = surface.frictionCoefficient;
    const v0 = run.launchSpeed;
    const t0 = HEIGHT_POS[run.height];
    let raf = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      placeCar('track', run.distance, ((run.distance * pxPerM) / WHEEL_R) * (180 / Math.PI));
      if (speedRef.current) speedRef.current.textContent = '0.0';
      if (distRef.current) distRef.current.textContent = run.distance.toFixed(1);
      dispatch({ type: 'finish-run' });
    };

    if (reducedMotion) {
      const t = window.setTimeout(finish, 250);
      return () => window.clearTimeout(t);
    }

    play('whoosh');
    const start = performance.now();
    const rampMs = RAMP_MS * Math.sqrt(1 - t0);
    const trackMs = run.duration * SLOW_MOTION * 1000;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed < rampMs) {
        const p = (elapsed / rampMs) ** 2; // accelerate down the ramp
        placeCar('ramp', t0 + (1 - t0) * p, p * 220);
        if (speedRef.current) speedRef.current.textContent = (v0 * Math.sqrt(p)).toFixed(1);
      } else {
        const t = Math.min(run.duration, (elapsed - rampMs) / 1000 / SLOW_MOTION);
        const d = positionAt(t, v0, mu);
        placeCar('track', d, 220 + ((d * pxPerM) / WHEEL_R) * (180 / Math.PI));
        if (speedRef.current) speedRef.current.textContent = speedAt(t, v0, mu).toFixed(1);
        if (distRef.current) distRef.current.textContent = d.toFixed(1);
        if (elapsed - rampMs >= trackMs) {
          finish();
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // React to finished runs: sound, records and mentor coaching.
  const lastHandledRun = useRef(0);
  useEffect(() => {
    if (state.phase !== 'result' || !state.current || state.runs.length === lastHandledRun.current) return;
    lastHandledRun.current = state.runs.length;
    const run = state.current;
    const s = surfaceById.get(run.surfaceId)!;
    const { onRecord: record } = eventsRef.current;
    const emit = say;
    play(run.predictionCorrect ? 'correct' : 'tap');
    record?.({ kind: 'experiment-run', surfaceId: run.surfaceId, predictionCorrect: run.predictionCorrect, mode: run.mode, distance: run.distance, height: run.height });
    const later = (key: string, vars?: Record<string, string>) => sayLater({ key, vars });

    if (run.mode === 'challenge') {
      const c = challenges.find((x) => x.id === run.challengeId)!;
      if (run.predictionCorrect) {
        emit({ key: 'challenge-success', vars: { explanation: c.explanation } });
        if (allChallengesSolved(state, config)) later('all-challenges');
      } else {
        // Hints get more specific: a nudge first, the challenge hint from the second try.
        const hint = state.attempts >= 2 ? c.hint : 'Change one thing and try again!';
        emit({ key: 'challenge-retry', vars: { distance: formatMetres(run.distance), actual: BAND_LABELS[run.band], hint } });
      }
    } else {
      emit({
        key: `run-finished:${run.predictionCorrect ? 'correct' : 'incorrect'}`,
        vars: { surface: s.name.toLowerCase(), distance: formatMetres(run.distance), predicted: BAND_LABELS[run.prediction], actual: BAND_LABELS[run.band] },
      });
      const tested = testedSurfaceIds(state);
      const isNewSurface = state.runs.filter((r) => r.surfaceId === run.surfaceId).length === 1;
      const sorted = comparison(state);
      if (isNewSurface && tested.length === config.surfaces.length) later('all-tested');
      else if (isNewSurface && tested.length >= 2) {
        const smoothest = surfaceById.get(sorted[0].surfaceId)!.name.toLowerCase();
        const roughest = surfaceById.get(sorted[sorted.length - 1].surfaceId)!.name.toLowerCase();
        later('compare', { smoothest, roughest });
      }
    }
  }, [state, surfaceById, config, challenges, play, say, sayLater]);

  // Report the result once, when every part of the lab (including the final question) is done.
  useEffect(() => {
    if (completedOnce.current || !labComplete) return;
    completedOnce.current = true;
    const predictions = state.runs.filter((r) => r.mode === 'explore');
    const correctPredictions = predictions.filter((r) => r.predictionCorrect).length;
    const checkFirstTry = config.check && state.checkAttempts === 1 ? 1 : 0;
    const correct = correctPredictions + state.solvedFirstTry.length + checkFirstTry;
    const total = predictions.length + challenges.length + (config.check ? 1 : 0);
    eventsRef.current.onComplete({
      gameType: 'friction-experiment',
      score: total ? correct / total : 1,
      correct,
      total,
      mistakes: total - correct,
      completed: true,
      perfect: correct === total,
      summary: challenges.length
        ? `Tested ${testedSurfaceIds(state).length} surfaces, ${correctPredictions} of ${predictions.length} predictions right, ${state.solvedFirstTry.length} of ${challenges.length} challenges solved first time`
        : `Tested ${testedSurfaceIds(state).length} surfaces in ${state.runs.length} runs, ${correctPredictions} correct prediction${correctPredictions === 1 ? '' : 's'}`,
    });
  }, [labComplete, state, config.check, challenges.length]);

  const selectSurface = (id: string) => {
    if (state.phase === 'running') return;
    if (state.phase === 'result' && state.mode !== 'challenge') dispatch({ type: 'next-run' });
    dispatch({ type: 'select-surface', surfaceId: id });
    setChangingSurface(false);
    play('tap');
    say({ key: `surface-selected:${id}` });
  };

  const chooseHeight = (height: RampHeight) => {
    if (state.phase === 'running' || !pushVisible) return;
    dispatch({ type: 'set-height', height });
    play('tap');
    say({ key: `height-selected:${height}` });
  };

  const predict = (band: DistanceBand) => {
    dispatch({ type: 'predict', prediction: band });
    play('tap');
    say({ key: 'prediction-made' });
  };

  const tryAnother = () => {
    dispatch({ type: 'next-run' });
    play('tap');
    say({ key: 'next-surface' });
  };

  const startChallenges = () => {
    dispatch({ type: 'start-challenges' });
    play('tap');
    if (challenges[0]) say({ key: 'challenge-start', vars: { number: '1', prompt: challenges[0].prompt } });
  };

  const nextAfterChallenge = () => {
    const solvedThis = state.current?.predictionCorrect;
    dispatch({ type: 'next-run' });
    const next = challenges[state.challengeIndex + 1];
    if (solvedThis && next) say({ key: 'challenge-start', vars: { number: String(state.challengeIndex + 2), prompt: next.prompt } });
  };

  const answerCheck = (optionId: string) => {
    if (!config.check) return;
    const correct = optionId === config.check.correctOptionId;
    dispatch({ type: 'answer-check', optionId });
    play(correct ? 'correct' : 'incorrect');
    say({ key: correct ? 'check-correct' : 'check-incorrect' });
  };

  /* --------------------------------------------------- drag the car up the ramp */
  const rampT = (e: ReactPointerEvent) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return HEIGHT_POS[state.height];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const [dx, dy] = [TRACK_X0 - RAMP_TOP[0], TRACK_Y - RAMP_TOP[1]];
    const t = ((p.x - RAMP_TOP[0]) * dx + (p.y - RAMP_TOP[1]) * dy) / (dx * dx + dy * dy);
    return Math.min(HEIGHT_POS.low, Math.max(0, t));
  };
  const nearestHeight = (t: number) => HEIGHTS.reduce((best, h) => (Math.abs(HEIGHT_POS[h] - t) < Math.abs(HEIGHT_POS[best] - t) ? h : best), 'top' as RampHeight);
  const onPointerDown = (e: ReactPointerEvent<SVGGElement>) => {
    if (!canDrag) return;
    dragging.current = true;
    beginPointerDrag(e);
  };
  const onPointerMove = (e: ReactPointerEvent<SVGGElement>) => {
    if (dragging.current) placeCar('ramp', rampT(e), 0);
  };
  const onPointerUp = (e: ReactPointerEvent<SVGGElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    const h = nearestHeight(rampT(e));
    placeCar('ramp', HEIGHT_POS[h], 0);
    if (h !== state.height) chooseHeight(h);
  };

  const sceneSurface = surface ?? (state.current ? surfaceById.get(state.current.surfaceId) : undefined);
  const latest = comparison(state);
  const bandRanges: Record<DistanceBand, [number, number]> = {
    short: [0, config.bands.mediumFrom],
    medium: [config.bands.mediumFrom, config.bands.farFrom],
    far: [config.bands.farFrom, config.trackLength],
  };
  const bandHint: Record<DistanceBand, string> = {
    short: `under ${config.bands.mediumFrom} m`,
    medium: `${config.bands.mediumFrom}-${config.bands.farFrom} m`,
    far: `over ${config.bands.farFrom} m`,
  };
  const exploreRuns = state.runs.filter((r) => r.mode === 'explore');
  const resultChallenge = challenges.find((c) => c.id === state.current?.challengeId);
  const showSurfaceChoice = surfaceChangeable && (!surface || changingSurface || state.mode === 'challenge');

  return (
    <div className="space-y-3">
      {challenge && <ChallengeStrip challenge={challenge} index={state.challengeIndex} challenges={challenges} solved={state.solved} surfaceById={surfaceById} />}

      {/* ------------------------------------------------------------ scene */}
      <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-[#EAF4FF] to-[#FDF8EF]">
        <svg ref={svgRef} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="block h-auto w-full touch-none select-none" role="img" aria-label={sceneLabel(state, surfaceById)}>
          <SurfacePatterns prefix={uid} />
          <circle cx="610" cy="48" r="24" fill="#FFE08A" />
          {/* ramp */}
          <path d={`M 8 ${TRACK_Y} L 8 ${RAMP_TOP[1] - 4} L ${TRACK_X0 + 4} ${TRACK_Y} Z`} fill="#B98B5C" />
          <path d={`M 8 ${RAMP_TOP[1] - 4} L ${TRACK_X0 + 4} ${TRACK_Y}`} stroke="#8A6239" strokeWidth="5" strokeLinecap="round" />
          {/* start height markers, only when the push can be changed */}
          {pushVisible &&
            HEIGHTS.map((h) => {
              const [x, y] = rampPoint(HEIGHT_POS[h]);
              const active = state.height === h;
              return <circle key={h} cx={x} cy={y - 2} r={active ? 7 : 5} fill={active ? '#5847E0' : '#fff'} stroke="#5847E0" strokeWidth="2.5" aria-hidden="true" />;
            })}
          {/* track surface */}
          <rect x={TRACK_X0} y={TRACK_Y} width={config.trackLength * pxPerM + 20} height="18" fill={sceneSurface ? `url(#${uid}-${sceneSurface.texture})` : '#D8D2C8'} />
          <rect x={TRACK_X0} y={TRACK_Y} width={config.trackLength * pxPerM + 20} height="3" fill="rgb(29 26 74 / 0.12)" />
          {/* distance bands */}
          {(Object.keys(bandRanges) as DistanceBand[]).map((b) => {
            const [a, z] = bandRanges[b];
            const target = challenge?.target === b;
            return (
              <g key={b}>
                <rect x={trackX(a)} y={TRACK_Y + 22} width={(z - a) * pxPerM} height="26" fill={BAND_STYLE[b].fill} stroke={target ? BAND_STYLE[b].text : 'none'} strokeWidth={target ? 3 : 0} />
                <text x={trackX((a + z) / 2)} y={TRACK_Y + 42} textAnchor="middle" fontFamily="Nunito Variable, sans-serif" fontWeight="800" fontSize={target ? 16 : 19} fill={BAND_STYLE[b].text}>
                  {target ? `Goal: ${BAND_TITLES[b]}` : BAND_TITLES[b]}
                </text>
              </g>
            );
          })}
          {/* metre markers */}
          {Array.from({ length: config.trackLength + 1 }, (_, m) => (
            <g key={m}>
              <line x1={trackX(m)} y1={TRACK_Y + 18} x2={trackX(m)} y2={TRACK_Y + 52} stroke="rgb(29 26 74 / 0.35)" strokeWidth="2" />
              <text x={trackX(m)} y={TRACK_Y + 74} textAnchor="middle" fontFamily="Nunito Variable, sans-serif" fontWeight="800" fontSize="20" fill="#46437A">
                {m} m
              </text>
            </g>
          ))}
          {/* where earlier runs stopped (latest per surface), so trials can be compared */}
          {latest.map((r) => {
            const s = surfaceById.get(r.surfaceId)!;
            const isCurrent = state.phase === 'result' && state.current?.surfaceId === r.surfaceId;
            return (
              <g key={r.surfaceId} transform={`translate(${trackX(r.distance)} ${TRACK_Y - 2})`} opacity={isCurrent ? 1 : 0.6}>
                <line x1="0" y1="0" x2="0" y2="-52" stroke="#1D1A4A" strokeWidth="2.5" />
                <path d="M0 -52 L 24 -45 L 0 -38 Z" fill={SURFACE_DOT[s.texture]} stroke="#1D1A4A" strokeWidth="1.5" />
              </g>
            );
          })}
          {/* car (drag it along the ramp when the push can be changed) */}
          <g
            ref={carRef}
            transform={`translate(${RAMP_TOP[0] - 32} ${RAMP_TOP[1]})`}
            className={cn(canDrag && 'cursor-grab active:cursor-grabbing')}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <rect x="-6" y="-34" width="76" height="46" fill="transparent" />
            <ToyCar />
          </g>
        </svg>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2" aria-hidden="true">
          <span className="chip bg-surface/90 text-xs text-ink-soft shadow-soft">
            Speed <span ref={speedRef} className="tabular-nums text-ink">0.0</span> m/s
          </span>
          <span className="chip bg-surface/90 text-xs text-ink-soft shadow-soft">
            Distance <span ref={distRef} className="tabular-nums text-ink">0.0</span> m
          </span>
        </div>
        {canDrag && (
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink/75 px-2.5 py-1 text-[0.7rem] font-bold text-white" aria-hidden="true">
            <Hand className="h-3.5 w-3.5" /> Drag the car, or tap a push below
          </span>
        )}
      </div>

      {/* --------------------------------------------- the current step only */}
      <div className="card p-4 sm:p-5" aria-live="polite">
        {showCheck && config.check ? (
          <ConceptCheckCard check={config.check} attempts={state.checkAttempts} correct={state.checkCorrect} onAnswer={answerCheck} />
        ) : state.phase === 'result' && state.current ? (
          <ResultView
            run={state.current}
            surface={surfaceById.get(state.current.surfaceId)!}
            challenge={resultChallenge}
            attempts={state.attempts}
            comparisonLine={state.current.mode === 'explore' ? compareLine(exploreRuns, surfaceById) : null}
            actions={
              state.mode === 'challenge' ? (
                <button type="button" className="btn btn-primary btn-lg w-full sm:w-auto" onClick={nextAfterChallenge}>
                  {state.current.predictionCorrect ? (
                    state.challengeIndex >= challenges.length - 1 ? (
                      <>
                        <Trophy className="h-5 w-5" aria-hidden="true" /> {config.check ? 'Last question' : 'Finish the lab'}
                      </>
                    ) : (
                      <>
                        Next challenge <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      </>
                    )
                  ) : (
                    <>
                      <RotateCcw className="h-5 w-5" aria-hidden="true" /> Try again
                    </>
                  )}
                </button>
              ) : state.mode === 'explore' && experimentDone && challenges.length > 0 ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" className="btn btn-primary btn-lg" onClick={startChallenges}>
                    <Target className="h-5 w-5" aria-hidden="true" /> Try the challenges
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={tryAnother}>
                    <FlaskConical className="h-5 w-5" aria-hidden="true" /> Test another surface
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn-primary btn-lg w-full sm:w-auto" onClick={tryAnother}>
                  <FlaskConical className="h-5 w-5" aria-hidden="true" /> {state.mode === 'explore' ? 'Try another surface' : 'Test another surface'}
                </button>
              )
            }
          />
        ) : (
          <div className="space-y-4">
            {/* 1. Surface */}
            {showSurfaceChoice ? (
              <SurfaceChoice surfaces={config.surfaces} selected={state.surfaceId} tested={state.runs.map((r) => r.surfaceId)} uid={uid} disabled={state.phase === 'running'} onSelect={selectSurface} />
            ) : (
              surface && (
                <p className="flex items-center justify-between gap-2 text-sm font-bold text-ink-soft">
                  <span>
                    Surface: <span className="text-ink">{surface.name}</span>
                    {!surfaceChangeable && <span className="text-ink-muted"> (stays the same)</span>}
                  </span>
                  {surfaceChangeable && state.phase !== 'running' && (
                    <button type="button" className="min-h-[40px] rounded-lg px-2 text-primary hover:bg-primary-soft" onClick={() => setChangingSurface(true)}>
                      Change
                    </button>
                  )}
                </p>
              )
            )}

            {/* Push: only in challenges that let the child change it */}
            {pushVisible && <PushChoice height={state.height} disabled={state.phase === 'running'} onChoose={chooseHeight} />}

            {/* 2. Predict (explore runs only) */}
            {state.mode !== 'challenge' && surface && !changingSurface && (
              <div>
                <p className="mb-2 font-bold">How far will the car roll on {surface.name.toLowerCase()}?</p>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Prediction">
                  {(['short', 'medium', 'far'] as DistanceBand[]).map((b) => (
                    <button
                      key={b}
                      type="button"
                      role="radio"
                      aria-checked={state.prediction === b}
                      disabled={state.phase === 'running'}
                      onClick={() => predict(b)}
                      className={cn(
                        'min-h-[64px] rounded-2xl border-2 px-2 py-2 text-center transition',
                        state.prediction === b ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-primary/40',
                      )}
                    >
                      <span className="block font-display text-lg font-semibold" style={{ color: BAND_STYLE[b].text }}>
                        {BAND_TITLES[b]}
                      </span>
                      <span className="block text-xs font-bold text-ink-muted">{bandHint[b]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Start: shown once there is something to test */}
            {(state.phase === 'ready' || state.phase === 'running') && !changingSurface && (
              <button type="button" className="btn btn-success btn-lg w-full" disabled={state.phase !== 'ready'} onClick={() => dispatch({ type: 'start' })}>
                <Play className="h-5 w-5 fill-current" aria-hidden="true" /> {state.phase === 'running' ? 'Rolling...' : challenge ? 'Test it' : 'Start'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Folded away until wanted: results so far and the model note */}
      {exploreRuns.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-sm font-extrabold text-primary hover:bg-primary-soft"
            aria-expanded={showResults}
            onClick={() => setShowResults((s) => !s)}
          >
            <ChevronDown className={cn('h-4 w-4 transition', showResults && 'rotate-180')} aria-hidden="true" /> My results ({exploreRuns.length})
          </button>
          {state.mode === 'explore' && state.phase !== 'running' && (
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-sm font-bold text-ink-muted hover:bg-ink/5"
              onClick={() => {
                dispatch({ type: 'reset' });
                lastHandledRun.current = 0;
                setChangingSurface(false);
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Start over
            </button>
          )}
        </div>
      )}
      {showResults && <ResultsPanel runs={exploreRuns} surfaceById={surfaceById} trackLength={config.trackLength} />}
      {labComplete && (
        <p className="flex items-center gap-2 rounded-2xl bg-success-soft px-4 py-3 font-bold text-success-strong" role="status">
          <Trophy className="h-5 w-5 shrink-0" aria-hidden="true" /> Lab complete! Less friction lets the car roll farther; more friction stops it sooner.
        </p>
      )}
    </div>
  );
}

function sceneLabel(state: FrictionGameState, surfaces: Map<string, SurfaceDefinition>): string {
  if (state.phase === 'result' && state.current) {
    return `The car rolled ${formatMetres(state.current.distance)} on ${surfaces.get(state.current.surfaceId)?.name}, starting from the ${RAMP_HEIGHT_NAMES[state.current.height].toLowerCase()} of the ramp.`;
  }
  if (state.phase === 'running') return 'The toy car is rolling down the ramp and along the track.';
  return `A toy car waits on the ramp at the ${RAMP_HEIGHT_NAMES[state.height].toLowerCase()} start. The track is marked from 0 to 5 metres.`;
}

/** "Polished wood 4.6 m · Gravel track 0.8 m" once two surfaces have been tried: invites comparing trials. */
function compareLine(runs: RunRecord[], surfaces: Map<string, SurfaceDefinition>): string | null {
  const latest = new Map<string, RunRecord>();
  for (const r of runs) latest.set(r.surfaceId, r);
  if (latest.size < 2) return null;
  return [...latest.values()]
    .sort((a, b) => b.distance - a.distance)
    .map((r) => `${surfaces.get(r.surfaceId)?.name} ${formatMetres(r.distance)}`)
    .join(' · ');
}

function SurfaceChoice({
  surfaces,
  selected,
  tested,
  uid,
  disabled,
  onSelect,
}: {
  surfaces: SurfaceDefinition[];
  selected: string | null;
  tested: string[];
  uid: string;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-bold">Choose a surface</p>
      <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label="Surface">
        {surfaces.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={selected === s.id}
            disabled={disabled}
            onClick={() => onSelect(s.id)}
            className={cn(
              'relative flex min-h-[92px] flex-col items-center gap-1.5 rounded-2xl border-2 p-2 text-center transition',
              selected === s.id ? 'border-primary bg-primary-soft shadow-soft' : 'border-line bg-surface hover:border-primary/40',
            )}
          >
            <svg viewBox="0 0 60 30" className="h-10 w-full rounded-xl" aria-hidden="true">
              <SurfacePatterns prefix={`${uid}-${s.id}`} />
              <rect width="60" height="30" fill={`url(#${uid}-${s.id}-${s.texture})`} />
            </svg>
            <span className="text-sm font-extrabold leading-tight">{s.name}</span>
            {tested.includes(s.id) && (
              <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-success text-white shadow-soft" title="Tested">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">tested</span>
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function PushChoice({ height, disabled, onChoose }: { height: RampHeight; disabled: boolean; onChoose: (h: RampHeight) => void }) {
  return (
    <div>
      <p className="mb-2 font-bold">Choose the push</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Ramp height">
        {HEIGHTS.map((h) => (
          <button
            key={h}
            type="button"
            role="radio"
            aria-checked={height === h}
            disabled={disabled}
            onClick={() => onChoose(h)}
            className={cn(
              'flex min-h-[60px] flex-col items-center justify-center rounded-2xl border-2 px-2 py-1.5 text-center transition',
              height === h ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-primary/40',
            )}
          >
            <span className="text-sm font-extrabold">{RAMP_HEIGHT_NAMES[h]}</span>
            <span className="text-xs font-bold text-ink-muted">{PUSH_WORDS[h]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChallengeStrip({
  challenge,
  index,
  challenges,
  solved,
  surfaceById,
}: {
  challenge: FrictionChallenge;
  index: number;
  challenges: FrictionChallenge[];
  solved: string[];
  surfaceById: Map<string, SurfaceDefinition>;
}) {
  return (
    <div className="rounded-3xl bg-primary-soft px-4 py-3" role="region" aria-label={`Challenge ${index + 1} of ${challenges.length}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary-strong">
          <Target className="h-4 w-4" aria-hidden="true" /> Challenge {index + 1} of {challenges.length}
        </p>
        <ol className="flex gap-1.5" aria-label="Challenge progress">
          {challenges.map((c, i) => (
            <li key={c.id} className={cn('h-2.5 w-6 rounded-full', solved.includes(c.id) ? 'bg-success' : i === index ? 'bg-primary' : 'bg-ink/10')}>
              <span className="sr-only">{solved.includes(c.id) ? `Challenge ${i + 1} solved` : `Challenge ${i + 1}`}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-1 font-display text-lg font-semibold leading-snug text-ink">{challenge.prompt}</p>
      {(challenge.surfaceId || challenge.height) && (
        <p className="mt-0.5 text-xs font-bold text-ink-soft">
          {challenge.surfaceId ? `Surface stays: ${surfaceById.get(challenge.surfaceId)?.name}` : `Push stays: ${RAMP_HEIGHT_NAMES[challenge.height!]} of the ramp`}
        </p>
      )}
    </div>
  );
}

function ResultView({
  run,
  surface,
  challenge,
  attempts,
  comparisonLine,
  actions,
}: {
  run: RunRecord;
  surface: SurfaceDefinition;
  challenge?: FrictionChallenge;
  attempts: number;
  comparisonLine: string | null;
  actions: ReactNode;
}) {
  const ok = run.predictionCorrect;
  return (
    <div className="space-y-3" role="status">
      <div className={cn('flex items-start gap-3 rounded-2xl p-3', ok ? 'bg-success-soft' : 'bg-reward-soft')}>
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-white', ok ? 'bg-success' : 'bg-reward-strong')} aria-hidden="true">
          {ok ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold leading-tight">
            {formatMetres(run.distance)} on {surface.name.toLowerCase()}
          </p>
          <p className="font-bold text-ink-soft">
            {challenge
              ? ok
                ? 'Challenge solved!'
                : `It stopped in the ${BAND_TITLES[run.band].toLowerCase()} zone, not ${BAND_TITLES[challenge.target].toLowerCase()}.`
              : ok
                ? `You predicted ${BAND_TITLES[run.prediction].toLowerCase()}. Right!`
                : `You predicted ${BAND_TITLES[run.prediction].toLowerCase()}. It rolled ${BAND_LABELS[run.band]}.`}
          </p>
        </div>
      </div>
      {challenge && !ok ? (
        <p className="flex gap-2 text-[0.98rem] leading-relaxed text-ink-soft">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-reward-strong" aria-hidden="true" />
          {attempts > 1 ? challenge.hint : 'Change one thing and try again.'}
        </p>
      ) : (
        <p className="text-[0.98rem] leading-relaxed text-ink-soft">{challenge ? challenge.explanation : surface.explanation}</p>
      )}
      {comparisonLine && (
        <p className="flex items-start gap-2 text-sm font-bold text-ink">
          <Scale className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> Same push, different surfaces: {comparisonLine}
        </p>
      )}
      {actions}
    </div>
  );
}

function ConceptCheckCard({
  check,
  attempts,
  correct,
  onAnswer,
}: {
  check: NonNullable<FrictionExperimentConfig['check']>;
  attempts: number;
  correct: boolean;
  onAnswer: (id: string) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-primary-strong">One last question</p>
      <p className="font-display text-xl font-semibold leading-snug">{check.prompt}</p>
      <div className="space-y-2" role="radiogroup" aria-label="Answer">
        {check.options.map((o) => {
          const isChosen = chosen === o.id;
          const right = correct && o.id === check.correctOptionId;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={isChosen}
              disabled={correct}
              onClick={() => {
                setChosen(o.id);
                onAnswer(o.id);
              }}
              className={cn(
                'flex min-h-[56px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-2 text-left font-bold transition',
                right ? 'border-success bg-success-soft' : isChosen && !correct ? 'border-reward bg-reward-soft' : 'border-line bg-surface hover:border-primary/40',
              )}
            >
              {o.text}
            </button>
          );
        })}
      </div>
      {correct ? (
        <p className="rounded-2xl bg-success-soft px-4 py-3 font-semibold text-success-strong">{check.explanation}</p>
      ) : (
        attempts > 0 && (
          <p className="flex gap-2 rounded-2xl bg-reward-soft px-4 py-3 font-semibold text-ink">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-reward-strong" aria-hidden="true" />
            {attempts > 1 ? check.explanation : check.hint}
          </p>
        )
      )}
    </div>
  );
}

function ResultsPanel({ runs, surfaceById, trackLength }: { runs: RunRecord[]; surfaceById: Map<string, SurfaceDefinition>; trackLength: number }) {
  const latest = new Map<string, RunRecord>();
  for (const r of runs) latest.set(r.surfaceId, r);
  const bars = [...latest.values()].sort((a, b) => b.distance - a.distance);
  return (
    <div className="card space-y-3 p-4 sm:p-5">
      <ul className="space-y-2.5" aria-label="Distance comparison">
        {bars.map((r) => {
          const s = surfaceById.get(r.surfaceId)!;
          return (
            <li key={r.surfaceId}>
              <div className="mb-1 flex justify-between text-sm font-bold">
                <span>{s.name}</span>
                <span className="tabular-nums">{formatMetres(r.distance)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-ink/[0.07]">
                <div className="h-full rounded-full" style={{ width: `${(Math.min(r.distance, trackLength) / trackLength) * 100}%`, backgroundColor: SURFACE_DOT[s.texture] }} />
              </div>
            </li>
          );
        })}
      </ul>
      {bars.length >= 2 && isFairComparison(bars) && <p className="text-sm font-bold text-success-strong">Fair test: every surface had the same push, so only the surface changed.</p>}
      <p className="text-xs text-ink-muted">
        Model note: every run starts with the same push, and friction is modelled as a steady slowing force. Distances are a simplified prediction, not exact real-world
        measurements.
      </p>
    </div>
  );
}
