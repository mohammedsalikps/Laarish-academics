import { ArrowLeft, Check, Flame, Star, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { Vector3 } from 'three';
import { MentorAvatar } from '../../components/mentor/MentorAvatar';
import { MentorPose } from '../../components/mentor/MentorPose';
import { Dialog, DialogBody } from '../../components/ui/Dialog';
import { getLesson } from '../../content';
import type { SubjectId } from '../../domain/types';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { localDateKey } from '../../lib/dates';
import { cn } from '../../lib/cn';
import { useAcademicsPrefs } from '../../state/academicsPrefs';
import { useProgress } from '../../state/ProgressProvider';
import { currentStreak } from '../../state/selectors';
import { IslandCanvas, type OverlayPin } from '../../world3d/IslandCanvas';
import type { IslandScene } from '../../world3d/IslandScene';
import { chapterPathUrl, rememberChapter, topicSheetUrl, worldPath } from '../../world3d/paths';
import { useHeaderBottom } from '../../world3d/useHeaderBottom';
import { useLiteMode } from '../../world3d/useLiteMode';
import { isMiniMaker } from '../../lib/ageGroup';
import { StreakWeek } from '../../components/progress/StreakWeek';
import { PathNode, type NodeKind } from './pins';
import { TopicSheet } from './TopicSheet';
import { chapterPath, percent, pinnedChapters } from './worldData';

/** Chapters with a matching Laarish kit get a "Make with your kit" checkpoint on the path (S3 note 6). */
const KIT_CHAPTERS = new Set(['magnets']);

/**
 * Chapter path (wireframe S3, Z3): the same world scene with a close camera,
 * topics as nodes along a path that ends at the chapter trophy. Lite mode
 * shows the same nodes as a list. The topic sheet (S4) opens over it.
 */
export default function ChapterPage() {
  const { subjectId, lessonId, topicId } = useParams();
  const { state } = useProgress();
  const prefs = useAcademicsPrefs();
  const navigate = useNavigate();
  const { lite } = useLiteMode();
  const [failed, setFailed] = useState(false);
  const [makeOpen, setMakeOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  // Rishi and his speech bubble sit over the bottom-left of the scene: topic pins keep clear of them.
  const mentorRef = useRef<HTMLDivElement>(null);
  const headerBottom = useHeaderBottom(headerRef, 180);
  const lesson = getLesson(lessonId);
  const path = lesson && lesson.subjectId === subjectId ? chapterPath(state, lesson, prefs) : undefined;
  useDocumentTitle(lesson ? lesson.title : 'Chapter');
  useEffect(() => {
    if (lesson && subjectId) rememberChapter(lesson.id, chapterPathUrl(subjectId, lesson.id));
  }, [lesson, subjectId]);
  if (!lesson || !path) return <Navigate to={subjectId ? worldPath(subjectId) : '/home'} replace />;

  const { world, topics, current } = path;
  // Required topics decide the chapter trophy; "Explore more" topics come after it.
  const required = topics.filter((t) => !t.topic.extension);
  const total = required.length;
  const progress = total ? path.mastered / total : 0;
  const currentIndex = current && required.includes(current) ? required.indexOf(current) + 1 : total;
  const chapterDone = total > 0 && path.mastered === total;
  const hasKit = KIT_CHAPTERS.has(lesson.id);
  // Mini Makers (Classes 7-8) see numbered nodes instead of step icons (wireframe M2).
  const makers = isMiniMaker(state.learner?.grade);

  // Nodes in path order: topics, a kit checkpoint halfway, the trophy at the landmark, then "Explore more".
  const topicNode = (view: (typeof topics)[number]) => ({
    id: view.topic.id,
    node: {
      kind: 'topic' as const,
      view,
      index: topics.indexOf(view) + 1,
      current: view === current && view.state !== 'completed',
      extension: view.topic.extension === true,
    },
  });
  const nodes: { id: string; node: NodeKind }[] = required.map(topicNode);
  if (hasKit)
    nodes.splice(Math.ceil(total / 2), 0, {
      id: 'make',
      node: { kind: 'make' },
    });
  nodes.push({
    id: 'trophy',
    node: {
      kind: 'trophy',
      done: chapterDone,
      title: `${lesson.title} champion`,
    },
  });
  for (const extra of topics.filter((t) => t.topic.extension)) nodes.push(topicNode(extra));

  const openNode = (id: string) => {
    if (id === 'make') setMakeOpen(true);
    else if (id === 'trophy') navigate(topicSheetUrl(world.subject.id, lesson.id, (current ?? topics[total - 1]).topic.id));
    else navigate(topicSheetUrl(world.subject.id, lesson.id, id));
  };

  // The same landmark as this chapter's pin on the world (S2).
  const pinned = pinnedChapters(world);
  const chapterIndex = Math.max(
    0,
    pinned.findIndex((c) => c.lesson.id === lesson.id),
  );
  const anchorsFor = (scene: IslandScene): Vector3[] => {
    const landmark = scene.worldAnchors(world.theme.style, Math.max(pinned.length, chapterIndex + 1))[chapterIndex];
    return scene.pathAnchors(world.theme.style, landmark, nodes.length);
  };
  const pins: OverlayPin[] = nodes.map((n, i) => ({
    id: n.id,
    anchor: (scene) => anchorsFor(scene)[i],
    node: <PathNode node={n.node} numbered={makers} onOpen={() => openNode(n.id)} />,
  }));

  // Streak bar (Mon–Sun of this week).
  const today = new Date();
  const streak = currentStreak(state, localDateKey(today));

  const sheetIndex = topicId ? topics.findIndex((t) => t.topic.id === topicId) : -1;
  const sheetView = sheetIndex >= 0 ? topics[sheetIndex] : undefined;
  const nextLabel = sheetIndex >= 0 && sheetIndex + 1 < total ? `Topic ${sheetIndex + 2}` : 'the trophy';
  const prerequisite = sheetIndex > 0 ? { view: topics[sheetIndex - 1], index: sheetIndex } : undefined;
  const use3d = !lite && !failed;
  const rishiLine = chapterDone
    ? `You mastered ${lesson.title}!`
    : current
      ? current.needsPractice
        ? `Practise ${current.topic.title} to reach 60%.`
        : `Next: Topic ${currentIndex}. Let's ${current.record ? 'keep going' : 'start'}!`
      : 'Pick a topic to start.';

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,#bfe7e3_0%,#e4f3ec_55%,#f6efe2_100%)]">
      {use3d ? (
        <IslandCanvas
          mode="world"
          style={world.theme.style}
          pins={pins}
          path={(scene) => anchorsFor(scene)}
          focus={(scene) => {
            const pts = anchorsFor(scene);
            const mid = pts[Math.floor(pts.length / 2)];
            const start = pts[0];
            return {
              target: mid.clone().setY(mid.y + 0.3),
              distance: 9.5,
              pitch: 42,
              yaw: Math.atan2(start.x - mid.x, start.z - mid.z),
            };
          }}
          onFail={() => setFailed(true)}
          label={`${lesson.title} chapter path in ${world.theme.name}. Topics are listed as buttons in order.`}
          className="absolute inset-0"
          safeTop={headerBottom}
          avoid={[mentorRef]}
          lift={false}
        />
      ) : (
        <main id="main" className="absolute inset-0 overflow-y-auto px-4 pb-44" style={{ paddingTop: headerBottom + 12 }}>
          <h2 className="sr-only">Topics in order</h2>
          <ol className="mx-auto max-w-xl space-y-2">
            {nodes.map((n) => (
              <li key={n.id} className="card px-3 py-2">
                <PathNode node={n.node} numbered={makers} onOpen={() => openNode(n.id)} compact />
              </li>
            ))}
          </ol>
        </main>
      )}

      {/* Sticky top panel: back, chapter, streak, chapter progress */}
      <header ref={headerRef} className="absolute inset-x-3 top-3 z-30 mx-auto max-w-xl space-y-2">
        <div className="flex items-center gap-2 rounded-full bg-white/95 p-1.5 pr-2 shadow-lift backdrop-blur">
          <Link
            to={worldPath(world.subject.id)}
            aria-label={`Back to ${world.theme.name}`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-line text-ink hover:bg-canvas"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <h1 className="min-w-0 flex-1 truncate font-display text-xl font-extrabold text-ink">{lesson.title}</h1>
          <MentorAvatar size={40} label="" className="ring-2 ring-reward" />
        </div>
        <div className="rounded-3xl bg-white/95 px-3 py-2 shadow-soft backdrop-blur">
          <div className="flex items-center gap-2">
            <Flame className={cn('h-5 w-5 shrink-0 text-[#E8833A]', streak > 0 && 'fill-current')} aria-hidden="true" />
            <span className="shrink-0 text-sm font-extrabold text-ink">{streak}-day streak</span>
            <div className="ml-auto">
              <StreakWeek activeDays={state.activeDays ?? []} today={today} />
            </div>
          </div>
          <div
            className="relative mt-2 h-3 rounded-full bg-canvas-sunken"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent(progress)}
            aria-label="Chapter progress"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-success" style={{ width: `${percent(progress)}%` }} />
            {[0.25, 0.5, 0.75].map((m) => (
              <Star
                key={m}
                className={cn('absolute -top-1 h-5 w-5 -translate-x-1/2', progress >= m ? 'fill-reward text-reward-strong' : 'fill-white text-line-strong')}
                style={{ left: `${m * 100}%` }}
                aria-hidden="true"
              />
            ))}
            <span
              className={cn(
                'absolute -right-1 -top-2 grid h-7 w-7 place-items-center rounded-full',
                chapterDone ? 'bg-reward text-ink' : 'bg-reward-soft text-reward-strong',
              )}
              aria-hidden="true"
            >
              <Trophy className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1 text-xs font-extrabold text-ink-soft">
            Topic {currentIndex} of {total} · {percent(progress)}%
          </p>
        </div>
      </header>

      {/* Rishi */}
      <div ref={mentorRef} className="pointer-events-none absolute bottom-3 left-2 z-20 flex items-end gap-1">
        <MentorPose pose={chapterDone ? 'cheer' : 'point'} height={140} className="drop-shadow-lg" />
        {/* On short phones the bubble would leave too little room for the topic pins: screen readers still get the line. */}
        <p className="pointer-events-auto mb-14 max-w-[210px] rounded-3xl rounded-bl-md bg-white px-4 py-3 font-display text-lg font-extrabold leading-snug text-ink shadow-lift [@media(max-height:799px)]:sr-only">
          {rishiLine}
        </p>
      </div>

      {sheetView && (
        <TopicSheet
          open
          onClose={() =>
            navigate(chapterPathUrl(world.subject.id, lesson.id), {
              replace: true,
            })
          }
          view={sheetView}
          index={sheetIndex + 1}
          nextLabel={nextLabel}
          prerequisite={prerequisite}
          onOpenPrerequisite={() => prerequisite && navigate(topicSheetUrl(world.subject.id, lesson.id, prerequisite.view.topic.id), { replace: true })}
        />
      )}
      <MakeAtHome open={makeOpen} onClose={() => setMakeOpen(false)} subjectId={world.subject.id as SubjectId} />
    </div>
  );
}

const HOME_TESTS = ['A steel spoon', 'A plastic lid', 'A coin', 'A sheet of paper', 'A key'];

/**
 * Make, the "try it at home" variant (wireframe L4b): five safe things to
 * test with a fridge magnet. Nothing is uploaded; ticks stay on this screen.
 */
function MakeAtHome({ open, onClose }: { open: boolean; onClose: () => void; subjectId: SubjectId }) {
  const [answers, setAnswers] = useState<Record<string, 'stuck' | 'didnt'>>({});
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Test five things in your kitchen with a fridge magnet"
      variant="sheet"
      description="Tick each one you tried. Did it stick?"
    >
      <DialogBody>
        <ul className="space-y-2">
          {HOME_TESTS.map((item) => {
            const a = answers[item];
            return (
              <li key={item} className="flex min-h-[56px] items-center gap-3 rounded-2xl border-2 border-line px-3">
                <span
                  className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border-2', a ? 'border-success bg-success text-white' : 'border-line')}
                  aria-hidden="true"
                >
                  {a && <Check className="h-4 w-4" />}
                </span>
                <span className="flex-1 font-extrabold text-ink">{item}</span>
                <span role="group" aria-label={`${item}: did it stick?`} className="flex gap-1">
                  {(['stuck', 'didnt'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={a === v}
                      onClick={() => setAnswers((prev) => ({ ...prev, [item]: v }))}
                      className={cn(
                        'min-h-[44px] rounded-full px-3 text-sm font-extrabold',
                        a === v ? 'bg-primary text-white' : 'bg-canvas-sunken text-ink-soft',
                      )}
                    >
                      {v === 'stuck' ? 'Stuck' : "Didn't"}
                    </button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 rounded-2xl bg-primary-soft p-3 text-sm font-bold text-ink">There's a Laarish kit for this. Ask a grown-up.</p>
        <button type="button" onClick={onClose} className="btn btn-primary mt-4 w-full">
          Done · I tried it
        </button>
        <p className="mt-1 text-center text-xs text-ink-muted">Ask a grown-up before testing anything that is not yours.</p>
      </DialogBody>
    </Dialog>
  );
}
