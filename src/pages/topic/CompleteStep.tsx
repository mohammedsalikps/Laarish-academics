import { ArrowLeft, ArrowRight, Coins, Lock, PartyPopper, RotateCcw, Sparkles, Trophy, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MentorAvatar } from '../../components/mentor/MentorAvatar';
import { Confetti } from '../../components/ui/Confetti';
import { Icon } from '../../components/ui/Icon';
import { ProgressRing, StarRow } from '../../components/ui/primitives';
import { lessonLabel, nextLessonInSubject, nextTopicInLesson, topicLabel } from '../../content';
import type { Lesson, Subject, TopicMeta } from '../../domain/types';
import { getAchievement } from '../../engine/achievements';
import { isTopicMastered, lessonView, passMastery, resumeStep, topicView } from '../../engine/progression';
import { useReducedMotion } from '../../hooks/usePreferences';
import { lessonParentName, lessonPath, topicPath } from '../../lib/paths';
import { useProgress } from '../../state/ProgressProvider';

export interface TopicSession {
  ledgerIndex: number;
  startedAt: string;
  practice: boolean;
}

/** Step 4: results, rewards earned this session, and what unlocks next. */
export function CompleteStep({
  subject,
  lesson,
  topic,
  session,
  onReplay,
}: {
  subject: Subject;
  lesson: Lesson;
  topic: TopicMeta;
  session: TopicSession;
  onReplay: () => void;
}) {
  const { state } = useProgress();
  const reducedMotion = useReducedMotion();
  const record = state.topics[topic.id];

  if (!record || record.status !== 'completed') {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="font-display text-2xl font-semibold">Almost there!</p>
        <p className="mt-2 text-ink-soft">Finish Learn, Play and Practice to see your rewards.</p>
        <Link to={topicPath(topic, resumeStep(record))} className="btn btn-primary mt-5">
          Back to the topic
        </Link>
      </div>
    );
  }

  const earned = state.ledger
    .slice(session.ledgerIndex)
    .filter((e) => e.kind === 'reward' && (e.topicId === topic.id || e.lessonId === lesson.id || e.key.startsWith('achievement:')));
  const xp = earned.reduce((s, e) => s + e.xp, 0);
  const coins = earned.reduce((s, e) => s + e.coins, 0);
  const newAchievements = Object.entries(state.achievements)
    .filter(([, v]) => v.unlockedAt >= session.startedAt)
    .map(([id]) => getAchievement(id))
    .filter((a) => a !== undefined);

  const mastery = record.bestMastery;
  const stars = record.stars;
  const passed = isTopicMastered(topic, state.topics);
  const pass = Math.round(passMastery(topic) * 100);

  const nextTopic = nextTopicInLesson(topic);
  const nextTopicView = nextTopic ? topicView(nextTopic, state.topics) : undefined;
  const lessonNow = lessonView(lesson, state.topics);
  const nextLesson = !nextTopic && lessonNow.state === 'completed' ? nextLessonInSubject(lesson) : undefined;
  const nextLessonView = nextLesson ? lessonView(nextLesson, state.topics) : undefined;
  const lessonJustCompleted = earned.some((e) => e.key === `lesson:${lesson.id}:complete`);

  const primary =
    nextTopicView && nextTopicView.state !== 'locked'
      ? { to: topicPath(nextTopicView.topic, resumeStep(nextTopicView.record)), label: 'Next Topic' }
      : nextLessonView && nextLessonView.state !== 'locked' && nextLessonView.state !== 'in-development'
        ? { to: lessonPath(subject.id, nextLessonView.lesson.id), label: 'Next Lesson' }
        : null;

  return (
    <div className="relative">
      {!reducedMotion && (passed || session.practice) && <Confetti />}
      <div className="mx-auto max-w-3xl text-center">
        <div className="flex justify-center">
          <MentorAvatar variant="full" size={150} mood="celebrating" />
        </div>
        <p className="eyebrow mt-2">{session.practice ? 'Practice complete' : 'Topic complete'}</p>
        <h2 className="mt-1 text-3xl font-semibold md:text-5xl">{stars === 3 ? 'Superstar explorer!' : passed ? 'Great work, explorer!' : 'Well done for finishing!'}</h2>
        <div className="mt-4 flex justify-center">
          <StarRow stars={stars} size={44} animate={!reducedMotion} />
        </div>
        <p className="mt-2 text-ink-soft">{topicLabel(topic)}</p>
      </div>

      <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-4 sm:flex-col sm:text-center">
          <ProgressRing value={mastery} size={76} tone={passed ? 'success' : 'reward'} label="Mastery">
            <span className="font-display text-lg font-semibold">{Math.round(mastery * 100)}%</span>
          </ProgressRing>
          <div>
            <p className="font-extrabold">Best mastery</p>
            <p className="text-sm text-ink-muted">{topic.play.assessed ? 'Practice and game combined' : 'From your practice score'}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4 sm:flex-col sm:justify-center sm:text-center">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Zap className="h-7 w-7 fill-current" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-2xl font-semibold">+{xp} XP</p>
            <p className="text-sm text-ink-muted">{xp > 0 ? 'Earned this time' : 'Rewards already collected'}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4 sm:flex-col sm:justify-center sm:text-center">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-reward-soft text-reward-strong">
            <Coins className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-2xl font-semibold">+{coins} coins</p>
            <p className="text-sm text-ink-muted">{coins > 0 ? 'For finishing and stars' : 'Earn new stars for more'}</p>
          </div>
        </div>
      </div>

      {newAchievements.length > 0 && (
        <div className="mx-auto mt-4 max-w-3xl rounded-3xl border border-reward/30 bg-reward-soft p-4">
          <p className="flex items-center gap-2 font-extrabold">
            <Trophy className="h-5 w-5 text-reward-strong" aria-hidden="true" /> New achievements
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {newAchievements.map((a) => (
              <li key={a.id} className="chip animate-pop-in bg-surface text-ink shadow-soft">
                <Icon name={a.icon} width={16} height={16} className="text-reward-strong" />
                {a.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mx-auto mt-4 max-w-3xl space-y-3">
        {!passed && (
          <NextCard tone="reward" icon={<Lock className="h-6 w-6" aria-hidden="true" />}>
            Reach <strong>{pass}% mastery</strong> to unlock {nextTopic ? <strong>{topicLabel(nextTopic)}</strong> : 'the next lesson'}. You are at {Math.round(mastery * 100)}%. Try Practice
            again. You can do it!
          </NextCard>
        )}
        {passed && nextTopicView && nextTopicView.state !== 'locked' && (
          <NextCard tone="success" icon={<Sparkles className="h-6 w-6" aria-hidden="true" />}>
            <span className="font-extrabold">Unlocked: {topicLabel(nextTopicView.topic)}</span>
            <span className="block text-sm text-ink-soft">{nextTopicView.topic.summary}</span>
          </NextCard>
        )}
        {passed && !nextTopic && lessonNow.state === 'completed' && (
          <NextCard tone="success" icon={<PartyPopper className="h-6 w-6" aria-hidden="true" />}>
            <span className="font-extrabold">{lessonJustCompleted ? 'Lesson complete!' : 'Every topic in this lesson is mastered.'}</span>
            <span className="block text-sm text-ink-soft">
              {nextLessonView
                ? nextLessonView.state === 'in-development'
                  ? `Next up is ${lessonLabel(nextLessonView.lesson)}. It is still being built, so explore another subject meanwhile!`
                  : `${lessonLabel(nextLessonView.lesson)} is unlocked.`
                : `You have finished every lesson in ${lessonParentName(lesson)} that is ready so far.`}
            </span>
          </NextCard>
        )}
        {passed && !nextTopic && lessonNow.state !== 'completed' && (
          <NextCard tone="reward" icon={<Lock className="h-6 w-6" aria-hidden="true" />}>
            Master every topic in {lessonLabel(lesson)} to finish the lesson. Check the roadmap for topics that need more practice.
          </NextCard>
        )}
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row sm:justify-center">
        {primary && (
          <Link to={primary.to} className="btn btn-primary btn-lg">
            {primary.label} <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        )}
        <Link to={lessonPath(subject.id, lesson.id)} className={primary ? 'btn btn-secondary btn-lg' : 'btn btn-primary btn-lg'}>
          <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back to Lesson Roadmap
        </Link>
        <button type="button" className="btn btn-ghost btn-lg" onClick={onReplay}>
          <RotateCcw className="h-5 w-5" aria-hidden="true" /> {passed ? 'Replay topic' : 'Practise again'}
        </button>
      </div>
    </div>
  );
}

function NextCard({ tone, icon, children }: { tone: 'success' | 'reward'; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={`card flex items-center gap-3 p-4 ${tone === 'success' ? 'border-success/30 bg-success-soft' : 'border-reward/40 bg-reward-soft'}`}>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone === 'success' ? 'bg-success text-white' : 'bg-surface text-reward-strong'}`}>{icon}</span>
      <p className="min-w-0 flex-1 text-ink">{children}</p>
    </div>
  );
}
