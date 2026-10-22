import { CircleHelp, X } from 'lucide-react';
import { Suspense, useCallback, useEffect, useState, type ComponentType } from 'react';
import { RAMP_HEIGHT_NAMES } from '../../../shared/mentor/scienceModels';
import { MentorBubble } from '../../components/mentor/MentorBubble';
import { Skeleton } from '../../components/ui/primitives';
import type { GameResult } from '../../domain/results';
import { coachLine, type GameEvent, type GameRecord, type MiniGameProps } from '../../games/framework';
import { BAND_LABELS, distanceBand, formatMetres, simulateRun } from '../../games/friction/simulation';
import { GAMES } from '../../games/registry';
import { useReducedMotion } from '../../hooks/usePreferences';
import { useProgress } from '../../state/ProgressProvider';
import { StepFooter, type StepViewProps } from './shared';

/** Remembers, for this browser session, whether the learner opened "How to play" for a topic. */
function useHowToPlay(topicId: string) {
  const key = `laarish:how-to-play:${topicId}`;
  const [open, setOpen] = useState(() => {
    try {
      return window.sessionStorage.getItem(key) === 'open';
    } catch {
      return false;
    }
  });
  const toggle = useCallback(() => {
    setOpen((o) => {
      try {
        window.sessionStorage.setItem(key, o ? 'closed' : 'open');
      } catch {
        /* storage is optional */
      }
      return !o;
    });
  }, [key]);
  return [open, toggle] as const;
}

/**
 * Step 2: one interactive game or experiment. The mentor gives one short
 * instruction at a time (it changes as the learner plays); full instructions
 * stay behind "How to play" until asked for.
 */
export function PlayStep({ topic, completed, onNext, onBack, setMentorExtras }: StepViewProps) {
  const { actions } = useProgress();
  const reducedMotion = useReducedMotion();
  const play = topic.play;
  const [attempt, setAttempt] = useState(0);
  const [coach, setCoach] = useState(() => play.coach.start ?? "Let's play!");
  const [finished, setFinished] = useState(false);
  const [showHow, toggleHow] = useHowToPlay(topic.id);
  const def = GAMES[play.game.type];
  const Game = def.Component as ComponentType<MiniGameProps>;

  // The mentor knows which game the learner is in and what they are trying to do now.
  useEffect(() => {
    setMentorExtras({ activity: `${play.title} (${def.name}). Current instruction: ${coach}` });
  }, [coach, play.title, def.name, setMentorExtras]);

  const onEvent = useCallback(
    (e: GameEvent) => {
      const line = coachLine(play.coach, e);
      if (line) setCoach(line);
    },
    [play.coach],
  );

  const onRecord = useCallback(
    (r: GameRecord) => {
      if (r.kind === 'observation') return setMentorExtras({ recentResult: r.text });
      if (play.game.type !== 'friction-experiment') return;
      const challenge = r.mode === 'challenge';
      // Challenge runs test a goal, not a prediction, so only explore runs count as predictions.
      actions.experimentRun(topic.id, r.surfaceId, !challenge && r.predictionCorrect);
      const surface = play.game.surfaces.find((s) => s.id === r.surfaceId);
      const distance = r.distance ?? simulateRun(play.game, r.surfaceId)?.distance;
      if (surface && distance !== undefined) {
        const from = r.height ? ` from the ${RAMP_HEIGHT_NAMES[r.height].toLowerCase()} of the ramp` : '';
        const band = BAND_LABELS[distanceBand(distance, play.game.bands)];
        setMentorExtras({
          recentResult: `On ${surface.name.toLowerCase()}${from} the car rolled ${formatMetres(distance)} (${band}). ${challenge ? `The challenge goal was ${r.predictionCorrect ? 'reached' : 'not reached yet'}.` : `Your prediction was ${r.predictionCorrect ? 'right' : 'not right'}.`}`,
        });
      }
    },
    [actions, topic.id, play.game, setMentorExtras],
  );

  const onComplete = useCallback(
    (result: GameResult) => {
      actions.gameResult(topic.id, result);
      setFinished(true);
      if (play.game.type !== 'friction-experiment') setMentorExtras({ recentResult: `${play.title}: ${result.summary}.` });
    },
    [actions, topic.id, play.game.type, play.title, setMentorExtras],
  );

  const restart = useCallback(() => {
    setAttempt((a) => a + 1);
    setFinished(false);
  }, []);

  return (
    <div>
      <div className="mb-3 flex items-start gap-2">
        <MentorBubble text={coach} className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={toggleHow}
          aria-expanded={showHow}
          aria-controls="how-to-play"
          className="mt-1 inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-2xl border border-line bg-surface px-3 text-sm font-extrabold text-ink-soft shadow-soft hover:text-primary"
        >
          <CircleHelp className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">How to play</span>
        </button>
      </div>

      {showHow && (
        <section id="how-to-play" aria-label="How to play" className="relative mb-3 animate-fade-up rounded-3xl bg-surface p-4 pr-12 shadow-soft">
          <button type="button" onClick={toggleHow} className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-xl text-ink-muted hover:bg-ink/5" aria-label="Close how to play">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <p className="font-display font-semibold">{play.title}</p>
          <p className="mt-0.5 text-sm font-bold text-primary-strong">{def.goal(play.game as never)}</p>
          <ol className="mt-2 space-y-1.5">
            {def.instructions(play.game as never).map((step, i) => (
              <li key={step} className="flex gap-2.5 text-[0.95rem]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-extrabold text-primary-strong">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}

      <Suspense fallback={<Skeleton className="h-[420px] w-full" />}>
        <Game
          key={attempt}
          config={play.game}
          topicId={topic.id}
          attempt={attempt}
          reducedMotion={reducedMotion}
          onEvent={onEvent}
          onRecord={onRecord}
          onComplete={onComplete}
          onRestart={restart}
        />
      </Suspense>

      <StepFooter onBack={onBack} onContinue={onNext} canContinue={completed || finished} continueLabel="Continue to Practice" hint="Finish the activity to unlock Practice" />
    </div>
  );
}
