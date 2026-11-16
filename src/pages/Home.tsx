import { ChevronRight, Flame, Gift, Star, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MentorAvatar } from '../components/mentor/MentorAvatar';
import { ProgressBar } from '../components/ui/primitives';
import { getTopicsForLesson } from '../content';
import { dailyMessage } from '../content/dailyMessages';
import { useMentorPersona } from '../mentor/useMentorPersona';
import type { SubjectId } from '../domain/types';
import { lessonView } from '../engine/progression';
import { MISSION_REWARD, missionView } from '../engine/missions';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { greetingForHour, localDateKey } from '../lib/dates';
import { topicPath } from '../lib/paths';
import { useAcademicsPrefs } from '../state/academicsPrefs';
import { useProgress } from '../state/ProgressProvider';
import { currentStreak, dailyGoal, levelInfo, nextActivity, totalStars, xpOnDay } from '../state/selectors';
import { chapterPathUrl } from '../world3d/paths';
import { WorldIcon } from '../world3d/WorldChip';
import { WorldHub } from '../world3d/WorldHub';
import { worldFor } from '../world3d/worlds';
import { ChapterPickerSheet } from './home/ChapterPickerSheet';
import { KitIdea } from './home/KitIdea';
import { MondayCheckIn } from './home/MondayCheckIn';
import { weekPlan } from './home/schoolWeek';
import { ThisWeekCard } from './home/ThisWeekCard';
import { allClassWorlds } from './world/worldData';

const CONTINUE_LABEL = { resume: 'Continue', start: 'Start', improve: 'Practise', replay: 'Play again' } as const;

/**
 * Home (wireframe H1–H5): "This week in school" leads, then the six-world hub,
 * Continue, and a calm kit idea. Missions and the progress line stay below.
 */
export default function Home() {
  useDocumentTitle('Home');
  const { state, actions } = useProgress();
  const prefs = useAcademicsPrefs();
  const persona = useMentorPersona();
  const learner = state.learner!;
  const now = new Date();
  const today = localDateKey(now);
  const level = levelInfo(state);
  const streak = currentStreak(state, today);
  const todayXp = xpOnDay(state, today);
  const goal = dailyGoal(state);
  const next = nextActivity(state);
  const mission = missionView(state, today);
  const worlds = allClassWorlds(state, prefs);
  const plan = weekPlan(state, worlds, prefs, now);
  const [sheet, setSheet] = useState<{ subject?: SubjectId; preselect?: string; focusDate?: boolean } | null>(null);
  const started = Object.keys(state.topics).length > 0;

  const nextLesson = next ? lessonView(next.lesson, state.topics) : undefined;
  const topicIndex = next ? getTopicsForLesson(next.lesson.id).findIndex((t) => t.id === next.topic.id) + 1 : 0;
  // "Explore more" topics sit after the chapter's required topics, so they are not "Topic 3 of 2".
  const where = next ? (next.topic.extension ? 'Explore more' : `Topic ${topicIndex} of ${nextLesson?.topicsTotal ?? 0}`) : '';

  return (
    <div className="page max-w-4xl">
      <section className="flex items-center gap-3">
        <MentorAvatar size={52} label={persona.name} className="shadow-soft" />
        <div className="min-w-0">
          <h1 className="font-display text-[1.65rem] font-extrabold leading-tight text-ink md:text-3xl">
            {started ? greetingForHour(now.getHours()) : 'Hello'}, {learner.displayName}!
          </h1>
          <p className="truncate font-semibold text-ink-soft">
            <span className="sr-only">{persona.name} says: </span>
            {dailyMessage(today)}
          </p>
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:items-start">
        <div className="space-y-3">
          <ThisWeekCard
            plan={plan}
            onChangeChapter={() => setSheet({ subject: plan?.world.subject.id as SubjectId | undefined })}
            onChangeDate={() => setSheet({ subject: plan?.world.subject.id as SubjectId | undefined, focusDate: true })}
          />

          {next ? (
            <Link
              to={next.kind === 'improve' ? topicPath(next.topic, 'practice') : chapterPathUrl(next.subject.id, next.lesson.id)}
              className="card flex items-center gap-3 p-3 transition hover:shadow-lift"
              aria-label={`${CONTINUE_LABEL[next.kind]}: ${next.topic.title}. ${worldFor(next.subject.id as SubjectId).name}, ${where.toLowerCase()}`}
            >
              <WorldIcon theme={worldFor(next.subject.id as SubjectId)} size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold text-ink">
                  {CONTINUE_LABEL[next.kind]} · {next.topic.title}
                </span>
                <span className="block truncate text-sm font-bold text-ink-muted">
                  {worldFor(next.subject.id as SubjectId).name} · {where}
                </span>
                <ProgressBar value={nextLesson?.progress ?? 0} size="sm" color="rgb(20 40 75)" label="Chapter progress" className="mt-1.5" />
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
            </Link>
          ) : (
            <p className="card p-4 font-bold text-ink-soft">Start anywhere: tap a world.</p>
          )}

          <KitIdea lessonId={plan?.path.chapter.lesson.id} />
        </div>

        <WorldHub worlds={worlds} />
      </div>

      {/* Only when there is something to collect */}
      {mission.complete && !mission.claimed && (
        <button type="button" onClick={actions.claimMission} className="mt-4 flex w-full items-center gap-3 rounded-3xl bg-coral-soft px-4 py-3 text-left font-bold text-coral-strong">
          <Gift className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">Mission complete: {mission.mission.title}</span>
          <span className="rounded-full bg-surface px-3 py-1 text-sm">Claim +{MISSION_REWARD.coins} coins</span>
        </button>
      )}

      {/* Compact progress */}
      <Link
        to="/progress"
        className="card mt-4 flex items-center gap-4 px-4 py-3 transition hover:shadow-lift"
        aria-label={`Level ${level.level}, ${totalStars(state)} stars, ${streak} day streak, ${todayXp} of ${goal} XP today. See my progress.`}
      >
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

      <ChapterPickerSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        worlds={worlds}
        initialSubject={sheet?.subject}
        preselect={sheet?.preselect}
        focusDate={sheet?.focusDate}
      />
      <MondayCheckIn worlds={worlds} onMovedOn={(subject, preselect) => setSheet({ subject, preselect })} />
    </div>
  );
}
