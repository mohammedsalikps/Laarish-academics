import { Gamepad2 } from 'lucide-react';
import { Suspense, useCallback, useEffect, useState, type ComponentType } from 'react';
import { RAMP_HEIGHT_NAMES } from '../../../shared/mentor/scienceModels';
import { MentorBubble } from '../../components/mentor/MentorBubble';
import { ErrorBoundary, type ErrorFallbackProps } from '../../components/ui/ErrorBoundary';
import { ProblemCard, RetryButton, SAVED_NOTE } from '../../components/ui/ErrorFallbacks';
import { Skeleton } from '../../components/ui/primitives';
import type { GameResult } from '../../domain/results';
import { coachLine, type GameEvent, type GameRecord, type MiniGameProps } from '../../games/framework';
import { BAND_LABELS, distanceBand, formatMetres, simulateRun } from '../../games/friction/simulation';
import { GAMES } from '../../games/registry';
import { useReducedMotion } from '../../hooks/usePreferences';
import { useProgress } from '../../state/ProgressProvider';
import { MissionCard } from './MissionCard';
import { StepFooter, type StepViewProps } from './shared';
import { feedbackTone, type FeedbackTone } from '../../games/feedback';

function GameErrorFallback({ reset, chunkError, onRestart }: ErrorFallbackProps & { onRestart: () => void }) {
  return (
    <ProblemCard
      icon={<Gamepad2 className="h-8 w-8" aria-hidden="true" />}
      title={chunkError ? "The game didn't download" : 'The game stopped working'}
      body={
        chunkError
          ? `Check your internet connection, then reload. ${SAVED_NOTE}`
          : `${SAVED_NOTE} Start the game again. Stars and rewards you already earned are kept.`
      }
    >
      {chunkError ? (
        <RetryButton reset={reset} chunkError />
      ) : (
        <RetryButton reset={onRestart} chunkError={false} label="Restart the game" />
      )}
    </ProblemCard>
  );
}

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
 * Step 2: one interactive game or experiment. The mission card keeps the goal
 * on screen, the mentor gives one short instruction at a time (it changes as
 * the learner plays), and full instructions stay behind "How to play" until
 * asked for.
 */
export function PlayStep({ topic, completed, onNext, onBack, setMentorExtras }: StepViewProps) {
  const { actions } = useProgress();
  const reducedMotion = useReducedMotion();
  const play = topic.play;
  const [attempt, setAttempt] = useState(0);
  const [coach, setCoach] = useState(() => play.coach.start ?? "Let's play!");
  const [tone, setTone] = useState<FeedbackTone>('neutral');
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<GameResult>();
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
      // The colour follows the words on screen: only events that change the line change it.
      if (line) {
        setCoach(line);
        setTone(feedbackTone(e.key));
      }
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
      setResult(result);
      if (play.game.type !== 'friction-experiment') setMentorExtras({ recentResult: `${play.title}: ${result.summary}.` });
    },
    [actions, topic.id, play.game.type, play.title, setMentorExtras],
  );

  const restart = useCallback(() => {
    setAttempt((a) => a + 1);
    setFinished(false);
    setResult(undefined);
    setCoach(play.coach.start ?? "Let's play!");
    setTone('neutral');
  }, [play.coach.start]);

  return (
    <div>
      <MissionCard
        play={play}
        def={def}
        objective={topic.objectives?.[0]}
        status={finished ? 'complete' : completed ? 'done-before' : 'playing'}
        result={result}
        showHow={showHow}
        onToggleHow={toggleHow}
        onReplay={finished || completed ? restart : undefined}
      />
      {/* Every engine announces its own feedback, so the coach line is not a second live region. */}
      <MentorBubble text={coach} tone={tone} live={false} className="mb-3" />

      {/* A game that breaks (or fails to download) can be restarted without leaving the topic; a new attempt clears the error. */}
      <ErrorBoundary resetKeys={[attempt]} fallback={(p) => <GameErrorFallback {...p} onRestart={restart} />}>
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
      </ErrorBoundary>

      <StepFooter
        onBack={onBack}
        onContinue={onNext}
        canContinue={completed || finished}
        continueLabel="Continue to Practice"
        hint="Finish the activity to unlock Practice"
      />
    </div>
  );
}
