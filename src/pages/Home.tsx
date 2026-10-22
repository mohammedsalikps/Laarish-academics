import { ArrowRight, ChevronRight, Flame, Gift, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MentorAvatar } from '../components/mentor/MentorAvatar';
import { StepDots } from '../components/navigation/StepDots';
import { Icon } from '../components/ui/Icon';
import { ProgressBar } from '../components/ui/primitives';
import { lessonLabel } from '../content';
import { dailyMessage } from '../content/dailyMessages';
import { MISSION_REWARD, missionView } from '../engine/missions';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { greetingForHour, localDateKey } from '../lib/dates';
import { subjectPath, topicPath } from '../lib/paths';
import { useMentorPersona } from '../mentor/useMentorPersona';
import { useProgress } from '../state/ProgressProvider';
import { currentStreak, dailyGoal, levelInfo, nextActivity, subjectViews, totalStars, xpOnDay } from '../state/selectors';

const STEP_NAME = { watch: 'Learn', play: 'Play', practice: 'Practice' } as const;
const CONTINUE_EYEBROW = { resume: 'Continue learning', start: 'Up next', improve: 'Practise to unlock more', replay: 'Play again' } as const;

/**
 * Home: the mentor's greeting, one clear next step, a compact progress line
 * and the subjects. Achievements and detailed progress live on their own pages.
 */
export default function Home() {
  useDocumentTitle('Home');
  const { state, actions } = useProgress();
  const persona = useMentorPersona();
  const learner = state.learner!;
  const now = new Date();
  const today = localDateKey(now);
  const level = levelInfo(state);
  const streak = currentStreak(state, today);
  const todayXp = xpOnDay(state, today);
  const goal = dailyGoal(state);
  const next = nextActivity(state);
  const nextRecord = next ? state.topics[next.topic.id] : undefined;
  const mission = missionView(state, today);
  const subjects = subjectViews(state);

  return (
    <div className="page max-w-4xl">
      {/* Greeting from the chosen mentor */}
      <section className="flex items-start gap-3 sm:items-center sm:gap-4">
        <MentorAvatar size={60} label={persona.name} className="shadow-soft" />
        <div className="min-w-0">
          <h1 className="text-[1.65rem] font-semibold leading-tight md:text-3xl">
            {greetingForHour(now.getHours())}, {learner.displayName}!
          </h1>
          <p className="mt-0.5 font-semibold leading-snug text-ink-soft">
            <span className="sr-only">{persona.name} says: </span>
            {dailyMessage(today)}
          </p>
        </div>
      </section>

      {/* The one primary action */}
      <section
        aria-labelledby="continue-title"
        className="mt-5 rounded-4xl p-5 text-white shadow-lift sm:p-7"
        style={{ background: `linear-gradient(135deg, ${next?.subject.color ?? '#5847E0'}, #5847E0)` }}
      >
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-white/80">{next ? CONTINUE_EYEBROW[next.kind] : 'All caught up'}</p>
        <h2 id="continue-title" className="mt-1.5 text-2xl font-semibold leading-tight md:text-3xl">
          {next ? next.topic.title : 'You finished every topic!'}
        </h2>
        <p className="mt-1 text-white/85">{next ? `${next.subject.name} · ${lessonLabel(next.lesson)}` : 'New lessons are on the way. Replay a topic to earn more stars.'}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link to={next ? topicPath(next.topic, next.step) : '/subjects'} className="btn btn-lg bg-surface text-primary-strong shadow-[0_4px_0_rgb(29_26_74/0.25)] hover:bg-white">
            {next ? (next.kind === 'resume' ? 'Continue learning' : next.kind === 'improve' ? 'Practise' : 'Start') : 'Explore subjects'} <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          {next && nextRecord && (
            <span className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold">
              {next.kind === 'resume' && `At ${STEP_NAME[next.step]}`}
              <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-ink">
                <StepDots done={nextRecord.completedSteps} />
              </span>
            </span>
          )}
        </div>
      </section>

      {/* Only when there is something to collect */}
      {mission.complete && !mission.claimed && (
        <button type="button" onClick={actions.claimMission} className="mt-3 flex w-full items-center gap-3 rounded-3xl bg-coral-soft px-4 py-3 text-left font-bold text-coral-strong">
          <Gift className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">Mission complete: {mission.mission.title}</span>
          <span className="rounded-full bg-surface px-3 py-1 text-sm">Claim +{MISSION_REWARD.coins} coins</span>
        </button>
      )}

      {/* Compact progress */}
      <Link to="/progress" className="card mt-3 flex items-center gap-4 px-4 py-3 transition hover:shadow-lift" aria-label={`Level ${level.level}, ${totalStars(state)} stars, ${streak} day streak, ${todayXp} of ${goal} XP today. See my progress.`}>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 text-sm font-extrabold">
            <span className="text-primary-strong">Level {level.level}</span>
            <span className="text-xs text-ink-muted">
              Today {Math.min(todayXp, 999)}/{goal} XP
            </span>
          </div>
          <ProgressBar value={level.progress} size="sm" label={`Progress to Level ${level.level + 1}`} className="mt-1.5" />
        </div>
        <span className="flex shrink-0 items-center gap-3 text-sm font-extrabold">
          <span className="flex items-center gap-1 text-reward-strong">
            <Star className="h-4 w-4 fill-current" aria-hidden="true" /> {totalStars(state)}
          </span>
          <span className="flex items-center gap-1 text-coral-strong">
            <Flame className={streak > 0 ? 'h-4 w-4 fill-current' : 'h-4 w-4'} aria-hidden="true" /> {streak}
          </span>
          <span className="hidden items-center gap-1 text-primary sm:flex">
            <Zap className="h-4 w-4 fill-current" aria-hidden="true" /> {level.xpIntoLevel}
          </span>
          <ChevronRight className="h-5 w-5 text-ink-muted" aria-hidden="true" />
        </span>
      </Link>

      {/* Subjects */}
      <section aria-labelledby="subjects-title" className="mt-7">
        <h2 id="subjects-title" className="mb-3 text-xl font-semibold">
          Subjects
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {subjects.map((v) => (
            <li key={v.subject.id}>
              <Link to={subjectPath(v.subject.id)} className="card flex items-center gap-3 px-4 py-3 transition hover:shadow-lift">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white" style={{ backgroundColor: v.subject.color }}>
                  <Icon name={v.subject.icon} width={22} height={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{v.subject.name}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <ProgressBar value={v.progress} size="sm" color={v.subject.color} label={`${v.subject.name} progress`} className="min-w-0 flex-1" />
                    <span className="shrink-0 text-xs font-bold text-ink-muted">
                      {v.topicsMastered}/{v.topicsTotal}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
