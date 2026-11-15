import { Check, Gamepad2, Pencil, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MentorPose } from '../../components/mentor/MentorPose';
import { topicPath } from '../../lib/paths';
import { cn } from '../../lib/cn';
import { chapterPathUrl } from '../../world3d/paths';
import { minutesLeft } from '../world/worldData';
import { testEyebrow, type WeekPlan } from './schoolWeek';

const STEP_ICONS = [
  { step: 'watch', label: 'Watch', Icon: Play },
  { step: 'play', label: 'Play', Icon: Gamepad2 },
  { step: 'practice', label: 'Practice', Icon: Pencil },
] as const;

/**
 * "This week in school" (wireframe H1, H4, H5): the heart of Home. One gold
 * action takes the child straight to this week's chapter path.
 */
export function ThisWeekCard({ plan, onChangeChapter, onChangeDate }: { plan: WeekPlan | null; onChangeChapter: () => void; onChangeDate: () => void }) {
  if (!plan) {
    return (
      <section aria-labelledby="this-week-title" className="card relative overflow-hidden p-5 pr-28 sm:pr-36">
        <p id="this-week-title" className="text-xs font-extrabold uppercase tracking-[0.15em] text-primary">
          This week in school
        </p>
        <p className="mt-2 font-display text-xl font-extrabold leading-snug text-ink sm:text-2xl">Tell Rishi what your class is learning, and he'll plan your week.</p>
        <button type="button" onClick={onChangeChapter} className="btn btn-primary mt-4">
          Set my chapters
        </button>
        <MentorPose pose="wave" height={128} className="absolute -bottom-1 right-2 sm:right-5" />
      </section>
    );
  }

  const { world, path, test, allDone } = plan;
  const lesson = path.chapter.lesson;
  const current = path.current;
  const title = `${world.subject.name} · ${lesson.title}`;

  if (test) {
    const first = path.topics.find((t) => t.mastery < 0.6 && t.state !== 'locked') ?? current;
    return (
      <section aria-labelledby="this-week-title" className="card relative overflow-hidden border-2 border-[#E8833A] p-5 pr-28 sm:pr-36">
        <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#B8540F]">{testEyebrow(test)}</p>
        <h2 id="this-week-title" className="mt-1 font-display text-2xl font-extrabold leading-tight text-ink">
          {title}
        </h2>
        <p className="mt-1 text-[1.05rem] font-bold text-ink-soft">
          {test.toRevise === 0 ? 'Every topic is ready' : `${test.toRevise} ${test.toRevise === 1 ? 'topic' : 'topics'} to revise`} ·{' '}
          {test.daysLeft === 1 ? '1 day left' : `${test.days.length}-day plan`}
        </p>
        <ul className="mt-3 flex gap-2" aria-label="Revision plan">
          {test.days.map((d) => (
            <li
              key={d.label}
              className={cn(
                'flex min-w-[64px] items-center justify-center gap-1 rounded-full px-3 py-1.5 text-sm font-extrabold',
                d.state === 'done' && 'bg-success text-white',
                d.state === 'today' && 'bg-reward-soft text-ink ring-2 ring-reward',
                (d.state === 'later' || d.state === 'missed') && 'bg-canvas-sunken text-ink-muted',
              )}
            >
              {d.label}
              {d.state === 'done' && <Check className="h-4 w-4" aria-label="revised" />}
              {d.state === 'today' && <span className="font-bold"> · today</span>}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {first && (
            <Link to={topicPath(first.topic, 'practice')} className="btn btn-primary">
              Revise now
            </Link>
          )}
          <button type="button" onClick={onChangeDate} className="min-h-[44px] font-extrabold text-primary hover:underline">
            Change date
          </button>
        </div>
        <MentorPose pose="point" height={128} className="absolute -bottom-1 right-2 sm:right-5" />
      </section>
    );
  }

  const steps = current ? STEP_ICONS.map((s) => ({ ...s, done: current.stepsDone.includes(s.step) })) : [];
  const left = steps.filter((s) => !s.done).length;
  const planLine = allDone
    ? 'Every topic mastered. Nice work, explore a world!'
    : current?.needsPractice
      ? `Practise ${current.topic.title} to reach 60%`
      : current
        ? `${left || 3} ${left === 1 ? 'activity' : 'activities'} · ${minutesLeft(current.topic, current)} min`
        : 'Start the first topic';

  return (
    <section aria-labelledby="this-week-title" className="card relative overflow-hidden p-5 pr-28 sm:pr-36">
      <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-primary">This week in school</p>
      <h2 id="this-week-title" className="mt-1 font-display text-2xl font-extrabold leading-tight text-ink">
        {title}
      </h2>
      <p className="mt-1 text-[1.05rem] font-bold text-ink-soft">{planLine}</p>
      {!allDone && steps.length > 0 && (
        <ul className="mt-3 flex gap-2" aria-label={`Today's steps in ${current!.topic.title}`}>
          {steps.map(({ step, label, Icon, done }) => (
            <li
              key={step}
              className={cn('grid h-10 w-10 place-items-center rounded-full', done ? 'bg-success text-white' : 'bg-primary-soft text-primary-strong')}
              aria-label={`${label}${done ? ', done' : ''}`}
            >
              {done ? <Check className="h-5 w-5" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link to={chapterPathUrl(world.subject.id, lesson.id)} className="btn btn-primary">
          {allDone ? 'Open the chapter' : "Start today's plan"}
        </Link>
        <button type="button" onClick={onChangeChapter} className="min-h-[44px] font-extrabold text-primary hover:underline">
          Change chapter
        </button>
      </div>
      <MentorPose pose="point" height={128} className="absolute -bottom-1 right-2 sm:right-5" />
    </section>
  );
}
