import { CloudOff, Lock, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MentorAvatar } from '../../components/mentor/MentorAvatar';
import { StepIndicator, type StepId, type StepItem } from '../../components/navigation/StepIndicator';
import { Skeleton } from '../../components/ui/primitives';
import { getLesson, getSubject, getTopic, lessonLabel, topicLabel, useTopicContent } from '../../content';
import { TOPIC_STEPS, type TopicStep } from '../../domain/types';
import { isLessonUnlocked, isStepAccessible, isTopicUnlocked, missingLessonPrerequisites, missingTopicPrerequisites, passMastery, resumeStep } from '../../engine/progression';
import { preloadGame } from '../../games/registry';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { lessonPath, subjectPath, topicPath } from '../../lib/paths';
import { useMentorContext } from '../../mentor/MentorProvider';
import { useProgress } from '../../state/ProgressProvider';
import { CompleteStep, type TopicSession } from './CompleteStep';
import { PlayStep } from './PlayStep';
import { PracticeStep } from './PracticeStep';
import type { MentorExtras } from './shared';
import { WatchStep } from './WatchStep';

const STEP_LABELS: Record<StepId, string> = { watch: 'Learn', play: 'Play', practice: 'Practice', complete: 'Complete' };

function isTopicStep(value: string | null): value is TopicStep {
  return TOPIC_STEPS.includes(value as TopicStep);
}

/** Level 5: one topic, learned in order: Learn (step id "watch") → Play → Practice → Complete. Keyed so session state resets per topic. */
export default function TopicPlayerPage() {
  const { topicId } = useParams();
  return <TopicPlayer key={topicId} />;
}

function TopicPlayer() {
  const { subjectId, lessonId, topicId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, actions } = useProgress();
  const subject = getSubject(subjectId);
  const lesson = getLesson(lessonId);
  const topic = getTopic(topicId);
  const valid = Boolean(subject && lesson && topic && lesson.subjectId === subject.id && topic.lessonId === lesson.id);
  const record = topic ? state.topics[topic.id] : undefined;
  const unlocked = Boolean(valid && topic && isTopicUnlocked(topic, state.topics));
  // The topic's video, game and quiz arrive with its subject's content, downloaded on first use.
  const content = useTopicContent(unlocked ? topic : undefined);
  const [session] = useState<TopicSession>(() => ({
    ledgerIndex: state.ledger.length,
    startedAt: new Date().toISOString(),
    // Decided once, so finishing the topic for the first time does not relabel this visit as practice.
    practice: topicId ? state.topics[topicId]?.status === 'completed' : false,
  }));
  const [extras, setExtras] = useState<MentorExtras>({});
  useDocumentTitle(topic && valid ? topicLabel(topic) : 'Topic');

  // The Learn step is stored as "watch" (saved progress uses that id); ?step=learn opens it too.
  const requested = params.get('step') === 'learn' ? 'watch' : params.get('step');
  const showComplete = requested === 'complete';
  const requestedOk = isTopicStep(requested) && isStepAccessible(record, requested);
  const resume = resumeStep(record);
  const step: TopicStep = requestedOk ? requested : resume;

  // Unknown or locked steps fall back to the furthest step the learner may open.
  useEffect(() => {
    if (!unlocked || showComplete || requestedOk) return;
    setParams({ step: resume }, { replace: true });
  }, [unlocked, showComplete, requestedOk, resume, setParams]);

  // Remember where to resume.
  useEffect(() => {
    if (topic && unlocked && !showComplete && requestedOk) actions.openStep(topic.id, step);
  }, [topic, unlocked, showComplete, requestedOk, step, actions]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step, showComplete]);

  // Fetch the game's code while the learner is on Watch, so Play opens instantly.
  const gameType = topic?.play.game.type;
  useEffect(() => {
    if (gameType && unlocked) preloadGame(gameType);
  }, [gameType, unlocked]);

  useMentorContext(
    valid && unlocked && topic
      ? {
          subjectId: topic.subjectId,
          lessonId: topic.lessonId,
          topicId: topic.id,
          step: showComplete ? 'complete' : step,
          ...extras,
          // What the learner is doing in the game only matters while they are playing it.
          activity: !showComplete && step === 'play' ? extras.activity : undefined,
          quiz: !showComplete && step === 'practice' ? extras.quiz : undefined,
        }
      : null,
  );

  const setMentorExtras = useCallback((x: MentorExtras) => setExtras((prev) => ({ ...prev, ...x })), []);
  const goTo = useCallback((id: StepId) => setParams({ step: id }), [setParams]);

  if (!valid || !subject || !lesson || !topic) {
    return (
      <CenteredMessage title="We couldn't find that topic" body="It may have moved. Let's head back to your subjects.">
        <Link to="/subjects" className="btn btn-primary">
          Explore subjects
        </Link>
      </CenteredMessage>
    );
  }

  if (!unlocked) {
    const lessonOpen = isLessonUnlocked(lesson, state.topics);
    const missingTopics = missingTopicPrerequisites(topic, state.topics);
    const missingLessons = lessonOpen ? [] : missingLessonPrerequisites(lesson, state.topics);
    const body = !lessonOpen
      ? lesson.status !== 'ready'
        ? 'This lesson is still being built.'
        : `Finish ${missingLessons.map((l) => lessonLabel(l)).join(' and ')} to unlock this lesson.`
      : `Reach ${Math.round(passMastery(topic) * 100)}% mastery in ${missingTopics.map((t) => topicLabel(t)).join(' and ')} to unlock this topic.`;
    return (
      <CenteredMessage title={`${topicLabel(topic)} is locked`} body={body} icon={<Lock className="h-8 w-8" aria-hidden="true" />}>
        {missingTopics[0] && lessonOpen && (
          <Link to={topicPath(missingTopics[0])} className="btn btn-primary">
            Go to {topicLabel(missingTopics[0])}
          </Link>
        )}
        <Link to={lessonOpen ? lessonPath(subject.id, lesson.id) : subjectPath(subject.id)} className="btn btn-secondary">
          Back to the roadmap
        </Link>
      </CenteredMessage>
    );
  }

  const index = TOPIC_STEPS.indexOf(step);
  const onNext = () => goTo(TOPIC_STEPS[index + 1] ?? 'complete');
  const onBack = index > 0 ? () => goTo(TOPIC_STEPS[index - 1]) : undefined;
  const completed = Boolean(record?.completedSteps.includes(step));
  const common = { subject, lesson, record, completed, practice: session.practice, onNext, onBack, setMentorExtras };

  const steps: StepItem[] = [
    ...TOPIC_STEPS.map((s): StepItem => ({
      id: s,
      label: STEP_LABELS[s],
      state: !showComplete && s === step ? 'current' : record?.completedSteps.includes(s) ? 'done' : isStepAccessible(record, s) ? 'available' : 'locked',
    })),
    { id: 'complete', label: STEP_LABELS.complete, state: showComplete ? 'current' : record?.status === 'completed' ? 'done' : 'locked' },
  ];

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-[var(--space-gutter)] pt-2">
          <button
            type="button"
            onClick={() => navigate(lessonPath(subject.id, lesson.id))}
            className="btn btn-ghost !min-h-[44px] !px-2.5"
            aria-label={`Exit topic and return to the ${lesson.title} roadmap`}
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <Link to={lessonPath(subject.id, lesson.id)} className="block truncate text-xs font-extrabold uppercase tracking-wider hover:underline" style={{ color: subject.color }}>
              {subject.name} · {lessonLabel(lesson)}
            </Link>
            <h1 className="truncate font-display text-base font-semibold leading-tight md:text-lg">{topicLabel(topic)}</h1>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-[var(--space-gutter)] pb-2 pt-1.5">
          <StepIndicator steps={steps} onSelect={goTo} />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl px-[var(--space-gutter)] pb-6 pt-3 md:pb-10 md:pt-6">
        {session.practice && !showComplete && (
          <p className="mb-3 flex items-center gap-2 rounded-2xl bg-primary-soft px-3 py-2 text-xs font-bold text-primary-strong sm:text-sm">
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" /> Replay: you can earn new stars, but rewards you already have won't repeat.
          </p>
        )}
        {showComplete ? (
          <CompleteStep subject={subject} lesson={lesson} topic={topic} session={session} onReplay={() => goTo('watch')} />
        ) : content.status === 'ready' ? (
          <div key={step} className="animate-fade-up">
            {step === 'watch' && <WatchStep {...common} topic={content.topic} />}
            {step === 'play' && <PlayStep {...common} topic={content.topic} />}
            {step === 'practice' && <PracticeStep {...common} topic={content.topic} />}
          </div>
        ) : content.status === 'error' ? (
          <div className="card mx-auto max-w-md p-6 text-center" role="alert">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-canvas-sunken text-ink-muted">
              <CloudOff className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold">This topic didn't load</h2>
            <p className="mt-1 text-ink-soft">Check your internet connection, then try again.</p>
            <button type="button" onClick={content.retry} className="btn btn-primary mt-5">
              <RotateCcw className="h-5 w-5" aria-hidden="true" /> Try again
            </button>
          </div>
        ) : (
          <div role="status" aria-live="polite">
            <p className="sr-only">Loading {topicLabel(topic)}…</p>
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="mt-2 h-4 w-80 max-w-full" />
            <Skeleton className="mt-4 aspect-video w-full rounded-3xl" />
            <Skeleton className="mt-4 h-24 w-full" />
          </div>
        )}
      </main>
    </div>
  );
}

function CenteredMessage({ title, body, icon, children }: { title: string; body: string; icon?: ReactNode; children?: ReactNode }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-canvas p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">{icon ?? <MentorAvatar size={56} />}</div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-ink-soft">{body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </main>
  );
}
