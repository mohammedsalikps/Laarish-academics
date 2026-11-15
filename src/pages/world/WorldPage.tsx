import { ArrowLeft, ChevronRight, List, Map as MapIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { MentorPose } from '../../components/mentor/MentorPose';
import { ProgressBar } from '../../components/ui/primitives';
import { GRADES, type Grade } from '../../domain/types';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useReducedMotion } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { useAcademicsPrefs } from '../../state/academicsPrefs';
import { useProgress } from '../../state/ProgressProvider';
import { IslandCanvas, type OverlayPin } from '../../world3d/IslandCanvas';
import { chapterPathUrl } from '../../world3d/paths';
import { useLiteMode } from '../../world3d/useLiteMode';
import { WorldIcon } from '../../world3d/WorldChip';
import { isWorldId } from '../../world3d/worlds';
import { ChapterBadge, ChapterPin } from './pins';
import { chapterLabel, classWorld, percent, type ChapterInfo } from './worldData';

const VIEW_KEY = 'laarish-academics:world-view';

function rememberedView(): 'world' | 'list' {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'world';
  } catch {
    return 'world';
  }
}

const SKY: Record<string, string> = {
  science: 'linear-gradient(180deg,#bfe7e3 0%,#e4f3ec 55%,#f6efe2 100%)',
  mathematics: 'linear-gradient(180deg,#1b2d55 0%,#2b4373 55%,#6f7ea3 100%)',
  english: 'linear-gradient(180deg,#cfe6f2 0%,#e6f1e2 60%,#f4efe0 100%)',
  hindi: 'linear-gradient(180deg,#c9c6ee 0%,#ede4f1 55%,#f8eedd 100%)',
  kannada: 'linear-gradient(180deg,#f3a26e 0%,#f6c39a 55%,#fae3cc 100%)',
  'social-science': 'linear-gradient(180deg,#d7d2f0 0%,#f1dcd9 55%,#f8e4d2 100%)',
};

function statusLine(c: ChapterInfo): string {
  switch (c.state) {
    case 'in-progress':
      return `In progress · ${percent(c.mastery)}%`;
    case 'mastered':
      return `Mastered · ${c.view.stars} stars`;
    case 'coming-soon':
      return 'Coming soon';
    case 'locked':
      return 'Opens after the chapter before it';
    default:
      return 'Not started';
  }
}

/**
 * Subject world (wireframe S1 fly-in, S2 world arrival, X3 Lite chapter list).
 * The same chapters and states drive the 3D pins and the list, so every
 * chapter is reachable without the scene.
 */
export default function WorldPage() {
  const { subjectId } = useParams();
  const { state } = useProgress();
  const prefs = useAcademicsPrefs();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { lite } = useLiteMode();
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<'world' | 'list'>(rememberedView);
  const [grade, setGrade] = useState<Grade>(state.learner?.grade ?? 6);
  const [arrival, setArrival] = useState(true);
  const world = isWorldId(subjectId) ? classWorld(state, subjectId, prefs, grade) : undefined;
  useDocumentTitle(world ? world.theme.name : 'World');

  useEffect(() => {
    const t = window.setTimeout(() => setArrival(false), reduced ? 200 : 1600);
    return () => window.clearTimeout(t);
  }, [reduced]);

  if (!world) return <Navigate to="/home" replace />;

  const use3d = !lite && !failed && view === 'world';
  const chooseView = (v: 'world' | 'list') => {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      // Remember for this visit only.
    }
  };
  const open = (c: ChapterInfo) => navigate(chapterPathUrl(world.subject.id, c.lesson.id));
  const anchors = (count: number) => (scene: Parameters<OverlayPin['anchor']>[0]) => scene.worldAnchors(world.theme.style, count);
  const pins: OverlayPin[] = world.chapters.map((c, i) => ({
    id: c.lesson.id,
    anchor: (scene) => anchors(world.chapters.length)(scene)[i],
    node: <ChapterPin chapter={c} onOpen={() => open(c)} />,
  }));
  const rishiLine = world.thisWeek ? `${world.thisWeek.lesson.title} is this week's chapter. Let's go!` : 'Pick a landmark to start.';

  return (
    <div className="relative h-[100dvh] overflow-hidden" style={{ background: SKY[world.subject.id] }}>
      {use3d ? (
        <IslandCanvas
          mode="world"
          style={world.theme.style}
          pins={pins}
          onFail={() => setFailed(true)}
          label={`${world.theme.name}, the ${world.subject.name} world for Class ${world.grade}. Chapter landmarks are listed as buttons.`}
          className="absolute inset-0"
        />
      ) : (
        <main id="main" className="absolute inset-0 overflow-y-auto px-4 pb-40 pt-[156px]">
          <h2 className="sr-only">Chapters</h2>
          <ul className="mx-auto max-w-xl space-y-2" aria-label={`${world.subject.name} Class ${world.grade} chapters`}>
            {world.chapters.map((c) => {
              const soon = c.state === 'coming-soon';
              const body = (
                <>
                  <ChapterBadge chapter={c} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[1.05rem] font-extrabold text-ink">{c.lesson.title}</span>
                    <span className="block text-sm font-bold text-ink-muted">{statusLine(c)}</span>
                  </span>
                  {c.thisWeek && <span className="chip shrink-0 bg-reward text-ink">This week</span>}
                  {!soon && <ChevronRight className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />}
                </>
              );
              return (
                <li key={c.lesson.id}>
                  {soon ? (
                    <div className="flex min-h-[64px] items-center gap-3 rounded-3xl border-2 border-dashed border-line bg-white/60 px-3 py-2" aria-label={chapterLabel(c)}>
                      {body}
                    </div>
                  ) : (
                    <Link
                      to={chapterPathUrl(world.subject.id, c.lesson.id)}
                      aria-label={chapterLabel(c)}
                      className={cn('card flex min-h-[64px] items-center gap-3 px-3 py-2 transition hover:shadow-lift', c.thisWeek && 'border-2 border-primary')}
                    >
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
            {world.chapters.length === 0 && <li className="card p-4 text-ink-soft">No chapters for Class {world.grade} yet.</li>}
          </ul>
          {!lite && !failed && (
            <button type="button" onClick={() => chooseView('world')} className="mx-auto mt-3 flex min-h-[48px] items-center gap-2 font-extrabold text-primary">
              <MapIcon className="h-5 w-5" aria-hidden="true" /> Show the 3D world instead
            </button>
          )}
        </main>
      )}

      {/* Header card (fixed while the world pans) */}
      <header className="absolute inset-x-3 top-3 z-30 mx-auto max-w-xl rounded-3xl bg-white/95 p-3 shadow-lift backdrop-blur">
        <div className="flex items-center gap-2">
          <Link to="/home" aria-label="Back to Home" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-line text-ink hover:bg-canvas">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <span className="flex min-w-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-extrabold" style={{ backgroundColor: world.theme.soft, color: '#14284B' }}>
            <WorldIcon theme={world.theme} size={26} />
            <span className="truncate">{world.theme.name}</span>
          </span>
          <label className="ml-auto flex shrink-0 items-center">
            <span className="sr-only">Class</span>
            <select
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value) as Grade)}
              className="min-h-[44px] rounded-full border-2 border-line bg-white px-3 text-sm font-extrabold text-ink"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Class {g}
                </option>
              ))}
            </select>
          </label>
        </div>
        <h1 className="mt-2 font-display text-xl font-extrabold text-ink">
          {world.subject.name} · Class {world.grade}
        </h1>
        <div className="mt-1 flex items-center gap-3">
          <span className="shrink-0 text-sm font-extrabold text-ink-soft">Mastery {percent(world.mastery)}%</span>
          <ProgressBar value={world.mastery} size="sm" label={`${world.subject.name} Class ${world.grade} mastery`} className="flex-1" />
        </div>
      </header>

      {!lite && !failed && view === 'world' && (
        <button
          type="button"
          onClick={() => chooseView('list')}
          className="absolute right-3 top-[148px] z-30 flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/95 px-3.5 text-sm font-extrabold text-ink shadow-soft"
        >
          <List className="h-4 w-4" aria-hidden="true" /> List view
        </button>
      )}

      {/* Rishi's line */}
      <div className="pointer-events-none absolute bottom-3 left-2 z-20 flex items-end gap-1">
        <MentorPose pose="point" height={150} className="drop-shadow-lg" />
        <p className="pointer-events-auto mb-16 max-w-[220px] rounded-3xl rounded-bl-md bg-white px-4 py-3 font-display text-lg font-extrabold leading-snug text-ink shadow-lift">{rishiLine}</p>
      </div>

      {/* S1: the world's name card on arrival (skippable by tap) */}
      {arrival && (
        <button
          type="button"
          onClick={() => setArrival(false)}
          className="absolute inset-0 z-40 grid place-items-center bg-white/10 animate-fade-in"
          aria-label={`${world.theme.name}. Tap to continue`}
        >
          <span className="rounded-3xl bg-white/80 px-8 py-5 text-center shadow-float backdrop-blur-md">
            <span className="mx-auto flex w-fit items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm font-extrabold" style={{ backgroundColor: world.theme.soft }}>
              <WorldIcon theme={world.theme} size={24} /> {world.subject.name} · Class {world.grade}
            </span>
            <span className="mt-2 block font-display text-[26px] font-extrabold text-ink">{world.theme.name}</span>
          </span>
        </button>
      )}
    </div>
  );
}
