import { CheckCircle2, CircleHelp, Target, X } from 'lucide-react';
import { SpeakButton } from '../../components/quiz/SpeakButton';
import { Pill } from '../../components/ui/primitives';
import type { GameResult } from '../../domain/results';
import type { TopicPlay } from '../../domain/types';
import type { MiniGameDefinition } from '../../games/framework';
import { useSpeech } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';

export type MissionStatus = 'playing' | 'complete' | 'done-before';

/**
 * The Play step's mission: what the game is about, what to achieve, whether it
 * counts towards mastery, and (on request) how to play. The goal is always on
 * screen; the step-by-step instructions open behind "How to play".
 */
export function MissionCard({
  play,
  def,
  status,
  result,
  showHow,
  onToggleHow,
}: {
  play: TopicPlay;
  def: Pick<MiniGameDefinition, 'name' | 'skill' | 'goal' | 'instructions'>;
  status: MissionStatus;
  /** The result of the game finished in this visit, if any. */
  result?: GameResult;
  showHow: boolean;
  onToggleHow: () => void;
}) {
  const speech = useSpeech();
  const goal = def.goal(play.game as never);
  const instructions = def.instructions(play.game as never);
  const scored = play.assessed && play.weight > 0;
  const complete = status === 'complete';

  return (
    <section aria-labelledby="mission-title" className={cn('mb-3 rounded-3xl border-2 bg-surface p-3 shadow-soft sm:p-4', complete ? 'border-success/40' : 'border-primary/15')}>
      <div className="flex items-start gap-3">
        <span
          className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', complete ? 'bg-success text-white' : 'bg-primary-soft text-primary')}
          aria-hidden="true"
        >
          {complete ? <CheckCircle2 className="h-6 w-6" /> : <Target className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">
            {complete ? 'Mission complete' : 'Your mission'} · {def.skill}
          </p>
          <h2 id="mission-title" className="font-display text-lg font-semibold leading-tight">
            {play.title}
          </h2>
          <p className="mt-0.5 font-bold text-primary-strong">{goal}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <SpeakButton text={`${play.title}. ${goal}`} label="Read the mission aloud" speech={speech} className="!h-11 !w-11" />
          <button
            type="button"
            onClick={onToggleHow}
            aria-expanded={showHow}
            aria-controls="how-to-play"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface px-3 text-sm font-extrabold text-ink-soft shadow-soft hover:text-primary"
          >
            <CircleHelp className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">How to play</span>
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 pl-14">
        {complete ? (
          <Pill tone="success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {result ? result.summary : 'Mission complete'}
          </Pill>
        ) : status === 'done-before' ? (
          <Pill tone="neutral">Done before: play again for fun</Pill>
        ) : (
          <Pill tone={scored ? 'reward' : 'sky'}>{scored ? 'Counts towards your mastery' : 'Explore and test: not scored'}</Pill>
        )}
        <span className="text-xs font-bold text-ink-muted">{def.name}</span>
      </div>

      {showHow && (
        <section id="how-to-play" aria-label="How to play" className="relative mt-3 animate-fade-up rounded-2xl bg-canvas p-4 pr-14">
          <button type="button" onClick={onToggleHow} className="absolute right-1.5 top-1.5 grid h-11 w-11 place-items-center rounded-xl text-ink-muted hover:bg-ink/5" aria-label="Close how to play">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <p className="font-display font-semibold">How to play</p>
          <ol className="mt-2 space-y-1.5">
            {instructions.map((step, i) => (
              <li key={step} className="flex gap-2.5 text-[0.95rem]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-extrabold text-primary-strong">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  );
}
