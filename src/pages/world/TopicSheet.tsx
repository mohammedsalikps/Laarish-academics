import { Check, Gamepad2, Lock, Pencil, Play, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SourceNote } from '../../components/curriculum/SourceNote';
import { Dialog, DialogBody } from '../../components/ui/Dialog';
import { getLesson } from '../../content';
import type { TopicStep } from '../../domain/types';
import { REWARD_RULES } from '../../engine/rules';
import { isStepAccessible, passMastery, resumeStep, type TopicView } from '../../engine/progression';
import { cn } from '../../lib/cn';
import { topicPath } from '../../lib/paths';
import { useProgress } from '../../state/ProgressProvider';
import { percent } from './worldData';

/** MasteryMeter (wireframe page 1): 0–100 % with the 60 % tick that "unlocks next". */
export function MasteryMeter({ value, pass = 0.6, unlocks, className }: { value: number; pass?: number; unlocks?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2 text-sm font-extrabold">
        <span className="text-ink">Mastery {percent(value)}%</span>
        {unlocks && <span className="text-right text-success-strong">{unlocks}</span>}
      </div>
      <div
        className="relative mt-1.5 h-3 rounded-full bg-canvas-sunken"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent(value)}
        aria-label={`Mastery ${percent(value)} percent; ${percent(pass)} percent unlocks the next topic`}
      >
        <div className={cn('h-full rounded-full', value >= pass ? 'bg-success' : 'bg-primary')} style={{ width: `${percent(value)}%` }} />
        <span className="absolute -top-1 h-5 w-[3px] rounded bg-ink" style={{ left: `${percent(pass)}%` }} aria-hidden="true" />
      </div>
    </div>
  );
}

const ROWS: { step: TopicStep | 'complete'; Icon: typeof Play }[] = [
  { step: 'watch', Icon: Play },
  { step: 'play', Icon: Gamepad2 },
  { step: 'practice', Icon: Pencil },
  { step: 'complete', Icon: Trophy },
];

/**
 * Topic sheet (wireframe S4): steps with what is in each, the mastery meter
 * and one gold Start. The locked variant has no gold button: nothing to start yet.
 */
export function TopicSheet({
  open,
  onClose,
  view,
  index,
  nextLabel,
  prerequisite,
  onOpenPrerequisite,
}: {
  open: boolean;
  onClose: () => void;
  view: TopicView;
  index: number;
  /** What 60 % opens ("Topic 3", "the chapter trophy"). */
  nextLabel: string;
  prerequisite?: { view: TopicView; index: number };
  onOpenPrerequisite: () => void;
}) {
  const { state } = useProgress();
  const topic = view.topic;
  const record = view.record;
  const pass = passMastery(topic);
  const locked = view.state === 'locked';

  if (locked) {
    return (
      <Dialog open={open} onClose={onClose} title={`Topic ${index}`} variant="sheet" description={topic.title}>
        <DialogBody>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-canvas-sunken text-ink-muted" aria-hidden="true">
              <Lock className="h-6 w-6" />
            </span>
            <p className="font-bold text-ink-soft">
              {prerequisite ? `Reach ${percent(pass)}% in Topic ${prerequisite.index} to open this.` : 'Finish the topic before this one to open it.'}
            </p>
          </div>
          {prerequisite && <MasteryMeter value={prerequisite.view.mastery} className="mt-4" />}
          {prerequisite && (
            <button type="button" onClick={onOpenPrerequisite} className="btn btn-secondary mt-5 w-full">
              Back to Topic {prerequisite.index}
            </button>
          )}
        </DialogBody>
      </Dialog>
    );
  }

  const done = new Set(view.stepsDone);
  const current = view.state === 'completed' ? null : resumeStep(record);
  const questions = topic.practice.questions.length;
  const describe: Record<TopicStep | 'complete', string> = {
    watch: 'Watch',
    play: `Play · ${topic.play.title}`,
    practice: `Practice · ${questions} ${questions === 1 ? 'question' : 'questions'}`,
    complete: 'Complete',
  };
  const startStep = view.state === 'completed' ? (view.needsPractice ? 'practice' : 'watch') : resumeStep(record);

  return (
    <Dialog open={open} onClose={onClose} title={`Topic ${index}`} description={topic.title} variant="sheet">
      <DialogBody>
        <MasteryMeter value={view.mastery} pass={pass} unlocks={`${percent(pass)}% opens ${nextLabel}`} />
        <ul className="mt-4 divide-y divide-line">
          {ROWS.map(({ step, Icon }) => {
            const isDone = step === 'complete' ? view.state === 'completed' : done.has(step);
            const isCurrent = step === current;
            const reachable = step === 'complete' ? view.state === 'completed' : isStepAccessible(record, step);
            const right =
              step === 'complete'
                ? `stars · +${REWARD_RULES.xp.topicComplete} XP`
                : step === 'watch' && topic.watch.video.status === 'missing'
                  ? 'Explainer · official video coming'
                  : '';
            const body = (
              <>
                <span
                  className={cn(
                    'grid h-11 w-11 shrink-0 place-items-center rounded-full',
                    isDone ? 'bg-success text-white' : step === 'complete' ? 'bg-reward-soft text-reward-strong' : 'bg-primary-soft text-primary-strong',
                  )}
                >
                  {isDone ? <Check className="h-5 w-5" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1 py-1">
                  <span className="line-clamp-2 text-[1.05rem] font-extrabold leading-snug text-ink">{describe[step]}</span>
                  {right && <span className="block text-sm font-bold text-ink-muted">{right}</span>}
                </span>
              </>
            );
            return (
              <li key={step}>
                {reachable ? (
                  <Link
                    to={topicPath(topic, step)}
                    className={cn('flex min-h-[56px] items-center gap-3 rounded-2xl px-2', isCurrent && 'bg-reward-soft')}
                    aria-label={`${describe[step]}${isDone ? ', done' : isCurrent ? ', up next' : ''}`}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex min-h-[56px] items-center gap-3 px-2 opacity-70" aria-label={`${describe[step]}, opens after the step before`}>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <Link to={topicPath(topic, startStep)} className="btn btn-primary mt-4 w-full">
          {view.state === 'completed' ? (view.needsPractice ? 'Practise again' : 'Play again') : view.state === 'in-progress' ? 'Continue' : 'Start'}
        </Link>
        <p className="mt-2 text-center text-sm text-ink-muted">
          About {topic.estimatedMinutes} minutes ·{' '}
          {state.settings.readAloud ? `${state.learner?.mentorId === 'ayra' ? 'Ayra' : 'Rishi'} reads everything aloud` : 'Read aloud is off'}
          {view.state === 'completed' && ' · Points are not earned twice; stars can improve.'}
        </p>
        {lessonOf(topic.lessonId) && <SourceNote lesson={lessonOf(topic.lessonId)!} topic={topic} className="mt-3 border-t border-line pt-3" />}
      </DialogBody>
    </Dialog>
  );
}

const lessonOf = (id: string) => getLesson(id);
