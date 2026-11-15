import { ArrowLeft, Lock, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MentorAvatar } from '../../components/mentor/MentorAvatar';
import { StepIndicator, type StepId, type StepItem } from '../../components/navigation/StepIndicator';
import { ErrorBoundary, type ErrorFallbackProps } from '../../components/ui/ErrorBoundary';
import { ProblemCard, RetryButton, SAVED_NOTE } from '../../components/ui/ErrorFallbacks';
import { getLesson, getSubject, getTopic, getTopicsForLesson, lessonLabel, topicLabel, useTopicContent } from '../../content';
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
import { TopicContentError, TopicContentLoading } from './TopicContentStatus';
import { WatchStep } from './WatchStep';
import { chapterReturnUrl } from '../../world3d/paths';
import { useReducedMotion } from '../../hooks/usePreferences';
import { getPrefs } from '../../state/academicsPrefs';
import { lowEndDevice } from '../../world3d/capability';

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

  // A new step starts at the top, and keyboard and screen-reader users land at its start
  // (not on the first view, where focus stays where the browser put it).
  const mainRef = useRef<HTMLElement>(null);
  const firstView = useRef(true);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [step, showComplete]);

  // Fetch the game's code while the learner is on Watch, so Play opens instantly.
  const gameType = topic?.play.game.type;
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (gameType && unlocked) preloadGame(gameType);
    // The magnet experiment's 3D bench (and three.js) too, when this device will show it.
    if (gameType === 'magnet-lab' && unlocked && !reducedMotion && getPrefs().liteMode !== 'on' && !lowEndDevice()) {
      void import('../../world3d/MagnetBenchScene').catch(() => {
        /* the bench falls back to 2D if it cannot load */
      });
    }
  }, [gameType, unlocked, reducedMotion]);

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
  // Back to the 3D chapter path when the topic was opened from it, else the lesson roadmap.
  const roadmapTo = chapterReturnUrl(lesson.id) ?? lessonPath(subject.id, lesson.id);
  const topicCount = getTopicsForLesson(lesson.id).length;
  const stepName = showComplete ? STEP_LABELS.complete : STEP_LABELS[step];
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
            onClick={() => navigate(roadmapTo)}
            className="btn btn-ghost !min-h-[44px] !px-2.5"
            aria-label={`Exit topic and return to the ${lesson.title} roadmap`}
          >
            <X className="h-6 w-6" aria-hidden="true" />
            <span className="hidden text-sm sm:inline" aria-hidden="true">
              Exit
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <Link to={roadmapTo} className="-my-1 block truncate py-1 text-xs font-extrabold uppercase tracking-wider hover:underline" style={{ color: subject.color }}>
              {subject.name} · {lessonLabel(lesson)}
            </Link>
            <h1 className="truncate font-display text-base font-semibold leading-tight md:text-lg">{topicLabel(topic)}</h1>
          </div>
          {topicCount > 1 && (
            <p className="shrink-0 rounded-full bg-canvas-sunken px-2.5 py-1 text-xs font-extrabold text-ink-soft">
              <span className="sr-only">
                Topic {topic.order} of {topicCount} in this lesson
              </span>
              <span aria-hidden="true">
                {topic.order}/{topicCount}
                <span className="hidden sm:inline"> topics</span>
              </span>
            </p>
          )}
        </div>
        {/* Announces the open step when it changes, for screen-reader users. */}
        <p className="sr-only" aria-live="polite">
          {showComplete ? `${stepName}: your results` : `Step ${index + 1} of ${TOPIC_STEPS.length}: ${stepName}`}
        </p>
        <div className="mx-auto max-w-4xl px-[var(--space-gutter)] pb-2 pt-1.5">
          <StepIndicator steps={steps} onSelect={goTo} />
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-4xl px-[var(--space-gutter)] pb-6 pt-3 outline-none md:pb-10 md:pt-6">
        {session.practice && !showComplete && (
          <p className="mb-3 flex items-center gap-2 rounded-2xl bg-primary-soft px-3 py-2 text-xs font-bold text-primary-strong sm:text-sm">
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" /> Replay: you can earn new stars, but rewards you already have won't repeat.
          </p>
        )}
        {/* A step that breaks shows a recovery card; the header and step buttons above keep working. */}
        <ErrorBoundary resetKeys={[step, showComplete]} fallback={(p) => <StepErrorFallback {...p} stepName={stepName} roadmapTo={roadmapTo} />}>
          {showComplete ? (
            <CompleteStep subject={subject} lesson={lesson} topic={topic} session={session} onReplay={() => goTo('watch')} />
          ) : content.status === 'ready' ? (
            <div key={step} className="animate-fade-up">
              {step === 'watch' && <WatchStep {...common} topic={content.topic} />}
              {step === 'play' && <PlayStep {...common} topic={content.topic} />}
              {step === 'practice' && <PracticeStep {...common} topic={content.topic} />}
            </div>
          ) : content.status === 'error' ? (
            <TopicContentError retry={content.retry} roadmapTo={roadmapTo} />
          ) : (
            <TopicContentLoading label={topicLabel(topic)} />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

function StepErrorFallback({ reset, chunkError, stepName, roadmapTo }: ErrorFallbackProps & { stepName: string; roadmapTo: string }) {
  return (
    <ProblemCard
      icon={<MentorAvatar size={56} mood="thinking" />}
      title={`The ${stepName} step hit a snag`}
      body={
        chunkError
          ? `Part of this step didn't download. Check your internet connection, then reload. ${SAVED_NOTE}`
          : `${SAVED_NOTE} Try this step again, or go back to the roadmap.`
      }
    >
      <RetryButton reset={reset} chunkError={chunkError} />
      <Link to={roadmapTo} className="btn btn-secondary">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back to the roadmap
      </Link>
    </ProblemCard>
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
