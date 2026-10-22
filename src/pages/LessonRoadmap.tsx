import { ArrowLeft, ArrowRight, Check, Clock, Lock, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SourceNote } from '../components/curriculum/SourceNote';
import { MentorAvatar } from '../components/mentor/MentorAvatar';
import { PageHeader } from '../components/navigation/Breadcrumbs';
import { RoadmapPath, type RoadmapNodeData } from '../components/navigation/RoadmapPath';
import { StepDots } from '../components/navigation/StepDots';
import { Dialog } from '../components/ui/Dialog';
import { ProgressRing, StarRow } from '../components/ui/primitives';
import { getBranch, getLesson, getSubject, lessonLabel, preloadTopicContent, topicLabel } from '../content';
import type { TopicStep } from '../domain/types';
import { lessonView, resumeStep, type TopicView } from '../engine/progression';
import { REWARD_RULES } from '../engine/rules';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn } from '../lib/cn';
import { lessonParentCrumbs, lessonParentName, lessonParentPath, lessonPath, topicPath } from '../lib/paths';
import { useMentorContext } from '../mentor/MentorProvider';
import { useProgress } from '../state/ProgressProvider';
import NotFound from './NotFound';

const STEP_LABELS: Record<TopicStep, string> = { watch: 'Learn', play: 'Play', practice: 'Practice' };

function topicSubtitle(v: TopicView): string {
  if (v.state === 'locked') return 'Locked';
  if (v.needsPractice) return `${Math.round(v.mastery * 100)}% · practise to unlock the next topic`;
  if (v.state === 'completed') return `${Math.round(v.mastery * 100)}% mastery`;
  if (v.state === 'in-progress') return `Next: ${STEP_LABELS[resumeStep(v.record)]}`;
  return `${v.topic.estimatedMinutes} min · Ready`;
}

/** Level 4: the topics of one lesson, in order. */
export default function LessonRoadmap() {
  const { subjectId, lessonId } = useParams();
  const subject = getSubject(subjectId);
  const lesson = getLesson(lessonId);
  const { state } = useProgress();
  const navigate = useNavigate();
  const [lockedInfo, setLockedInfo] = useState<TopicView | null>(null);
  useDocumentTitle(lesson ? lessonLabel(lesson) : 'Not found');
  useMentorContext(subject && lesson ? { subjectId: subject.id, lessonId: lesson.id, step: 'none' } : null);
  // Fetch the subject's topic content now, so a topic opens without waiting.
  const preloadSubject = lesson?.status === 'ready' ? lesson.subjectId : undefined;
  useEffect(() => {
    if (preloadSubject) preloadTopicContent(preloadSubject);
  }, [preloadSubject]);

  if (!subject || !lesson || lesson.subjectId !== subject.id) return <NotFound />;

  const view = lessonView(lesson, state.topics);
  const crumbs = [...lessonParentCrumbs(lesson), { label: lessonLabel(lesson) }];
  const branch = getBranch(subject.id, lesson.branchId);
  const eyebrow = [subject.name, branch?.title, `Lesson ${lesson.order}`].filter(Boolean).join(' · ');

  if (view.state === 'locked' || view.state === 'in-development') {
    return (
      <div className="page max-w-3xl">
        <PageHeader crumbs={crumbs} eyebrow={eyebrow} eyebrowColor={subject.color} title={lesson.title} description={lesson.summary} />
        <div className="card flex flex-col items-center p-8 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-canvas-sunken text-ink-muted">
            <Lock className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold">{view.state === 'locked' ? 'This lesson is locked' : 'Coming soon'}</h2>
          <p className="mt-2 max-w-md text-ink-soft">
            {view.state === 'locked'
              ? `Master every topic in ${view.missing.map((m) => m.title).join(' and ')} to unlock it.`
              : 'This lesson is still being built. Explore another lesson meanwhile!'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {view.missing[0] && (
              <Link to={lessonPath(subject.id, view.missing[0].id)} className="btn btn-primary">
                Go to {view.missing[0].title}
              </Link>
            )}
            <Link to={lessonParentPath(lesson)} className="btn btn-secondary">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back to {lessonParentName(lesson)}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const next = view.nextTopic;
  const nextView = view.topics.find((t) => t.topic.id === next?.id);
  const continueLabel = !next
    ? 'Review this lesson'
    : nextView?.needsPractice
      ? `Practise ${topicLabel(next)}`
      : nextView?.state === 'in-progress'
        ? `Continue ${topicLabel(next)}`
        : `Start ${topicLabel(next)}`;
  const continueTo = next
    ? topicPath(next, nextView?.needsPractice ? 'practice' : resumeStep(nextView?.record))
    : topicPath(view.topics[0].topic, 'watch');

  const nodes: RoadmapNodeData[] = view.topics.map((v) => ({
    id: v.topic.id,
    number: v.topic.order,
    title: v.topic.title,
    subtitle: topicSubtitle(v),
    state: v.state,
    icon: v.topic.icon,
    stars: v.stars,
    progress: v.stepsDone.length / 3,
    recommended: next?.id === v.topic.id && v.state !== 'locked',
    recommendedLabel: v.state === 'in-progress' ? 'Continue' : v.needsPractice ? 'Practise' : 'Start here',
    detail: v.state !== 'locked' ? <StepDots done={v.stepsDone} /> : undefined,
    ariaLabel: `${topicLabel(v.topic)}, ${topicSubtitle(v)}`,
    onSelect: () => (v.state === 'locked' ? setLockedInfo(v) : navigate(topicPath(v.topic))),
  }));

  return (
    <div className="page max-w-6xl">
      <PageHeader
        crumbs={crumbs}
        eyebrow={eyebrow}
        eyebrowColor={subject.color}
        title={lesson.title}
        description={lesson.intro}
        aside={
          <div className="flex items-center gap-3 rounded-3xl bg-surface p-3 pr-5 shadow-soft">
            <ProgressRing value={view.progress} size={64} tone={view.state === 'completed' ? 'success' : 'primary'} label="Lesson progress">
              <span className="text-sm font-extrabold">{Math.round(view.progress * 100)}%</span>
            </ProgressRing>
            <div>
              <p className="font-extrabold">
                {view.topicsMastered} of {view.topicsTotal} topics
              </p>
              <p className="flex items-center gap-1 text-sm text-ink-muted">
                <StarRow stars={Math.min(3, view.topicsTotal ? Math.round(view.stars / view.topicsTotal) : 0)} size={14} /> {view.stars}/{view.maxStars}
              </p>
            </div>
          </div>
        }
      >
        <SourceNote lesson={lesson} />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link to={continueTo} className="btn btn-primary btn-lg">
            {next ? continueLabel : (
              <>
                <RotateCcw className="h-5 w-5" aria-hidden="true" /> {continueLabel}
              </>
            )}
            {next && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
          </Link>
          <Link to={lessonParentPath(lesson)} className="btn btn-ghost">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" /> {lessonParentName(lesson)} roadmap
          </Link>
        </div>
      </PageHeader>

      {view.state === 'completed' && (
        <p className="mb-6 flex items-center gap-3 rounded-3xl bg-success-soft p-4 font-bold text-success-strong">
          <MentorAvatar size={48} mood="celebrating" /> Lesson complete! Every topic is mastered. You can replay any topic to earn more stars.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-4xl px-2 py-6" style={{ background: `linear-gradient(180deg, ${subject.softColor}, transparent)` }} aria-label="Topic roadmap">
          <RoadmapPath nodes={nodes} color={subject.color} label={`Topics in ${lessonLabel(lesson)}`} />
        </section>

        <section aria-labelledby="topics-list">
          <h2 id="topics-list" className="mb-3 text-xl font-semibold">
            Topics in this lesson
          </h2>
          <ol className="space-y-3">
            {view.topics.map((v) => (
              <li key={v.topic.id} className={cn('card p-4', v.state === 'locked' && 'bg-surface/70')}>
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-extrabold',
                      v.state === 'completed' ? 'bg-success text-white' : v.state === 'locked' ? 'bg-canvas-sunken text-ink-muted' : 'text-white',
                    )}
                    style={v.state === 'available' || v.state === 'in-progress' ? { backgroundColor: subject.color } : undefined}
                    aria-hidden="true"
                  >
                    {v.state === 'completed' ? <Check className="h-5 w-5" /> : v.state === 'locked' ? <Lock className="h-4 w-4" /> : v.topic.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold leading-tight">{topicLabel(v.topic)}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{v.topic.summary}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {v.topic.estimatedMinutes} min
                      </span>
                      {v.state !== 'locked' && <StepDots done={v.stepsDone} />}
                      {v.state === 'completed' && <StarRow stars={v.stars} size={13} />}
                    </div>
                    {v.needsPractice && (
                      <p className="mt-2 text-xs font-bold text-reward-strong">
                        Reach {Math.round(REWARD_RULES.unlock.minMastery * 100)}% mastery to unlock the next topic. You have {Math.round(v.mastery * 100)}%.
                      </p>
                    )}
                  </div>
                  {v.state === 'locked' ? (
                    <span className="chip shrink-0 bg-canvas-sunken text-xs text-ink-muted">Locked</span>
                  ) : (
                    <Link
                      to={topicPath(v.topic, v.needsPractice ? 'practice' : v.state === 'completed' ? 'watch' : resumeStep(v.record))}
                      className="btn btn-secondary btn-sm shrink-0"
                      aria-label={`${v.state === 'completed' ? 'Replay' : v.state === 'in-progress' ? 'Continue' : 'Start'} ${topicLabel(v.topic)}`}
                    >
                      {v.state === 'completed' ? 'Replay' : v.state === 'in-progress' ? 'Continue' : 'Start'}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <Dialog open={Boolean(lockedInfo)} onClose={() => setLockedInfo(null)} title={lockedInfo ? topicLabel(lockedInfo.topic) : ''}>
        {lockedInfo && (
          <div className="space-y-4 px-5 pb-6 pt-3 sm:px-6">
            <p className="text-ink-soft">{lockedInfo.topic.summary}</p>
            <p className="flex items-start gap-2 rounded-2xl bg-reward-soft px-4 py-3 text-sm font-bold">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-reward-strong" aria-hidden="true" />
              {lockedInfo.missing.length
                ? `Master ${lockedInfo.missing.map((m) => topicLabel(m)).join(' and ')} (${Math.round(REWARD_RULES.unlock.minMastery * 100)}% or more) to unlock this topic.`
                : 'Finish the topic before this one to unlock it.'}
            </p>
            {lockedInfo.missing[0] && (
              <Link to={topicPath(lockedInfo.missing[0])} className="btn btn-primary w-full" onClick={() => setLockedInfo(null)}>
                Go to {topicLabel(lockedInfo.missing[0])} <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
