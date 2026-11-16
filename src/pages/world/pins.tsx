import { Box, Check, Crown, Gamepad2, Lock, Pencil, Play, Star, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { Icon } from '../../components/ui/Icon';
import type { TopicStep } from '../../domain/types';
import type { TopicView } from '../../engine/progression';
import { resumeStep } from '../../engine/progression';
import { cn } from '../../lib/cn';
import { chapterLabel, percent, type ChapterInfo } from './worldData';


/** The round marker used on pins and in the list (ring = mastery). */
export function ChapterBadge({ chapter, size = 52 }: { chapter: ChapterInfo; size?: number }) {
  const m = chapter.mastery;
  const r = size / 2 - 3;
  const circ = 2 * Math.PI * r;
  if (chapter.state === 'mastered') {
    return (
      <span className="grid shrink-0 place-items-center rounded-full bg-reward text-ink shadow-lift ring-4 ring-white" style={{ width: size, height: size }} aria-hidden="true">
        <Crown style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={2.4} />
      </span>
    );
  }
  const soon = chapter.state === 'coming-soon';
  return (
    <span
      className={cn('relative grid shrink-0 place-items-center rounded-full bg-white text-primary-strong shadow-lift', soon && 'border-2 border-dashed border-line-strong text-ink-muted shadow-none')}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {!soon && (
        <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(184 226 228)" strokeWidth={4} />
          {m > 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(15 116 121)" strokeWidth={4} strokeLinecap="round" strokeDasharray={`${circ * m} ${circ}`} />}
        </svg>
      )}
      {chapter.state === 'locked' ? <Lock style={{ width: size * 0.38, height: size * 0.38 }} /> : <Icon name={chapter.lesson.icon} width={size * 0.44} height={size * 0.44} />}
    </span>
  );
}

/** ChapterPin (wireframe page 1 + S2): landmark marker on the 3D world, 56 px hit area. */
export function ChapterPin({ chapter, onOpen }: { chapter: ChapterInfo; onOpen: () => void }) {
  const soon = chapter.state === 'coming-soon';
  const label = soon ? `${chapter.lesson.title} · soon` : chapter.state === 'in-progress' ? `${chapter.lesson.title} · ${percent(chapter.mastery)}%` : chapter.lesson.title;
  return (
    <button
      type="button"
      onClick={soon ? undefined : onOpen}
      aria-disabled={soon || undefined}
      aria-label={chapterLabel(chapter)}
      className={cn('group flex min-w-[56px] flex-col items-center gap-1 pb-1 focus-visible:outline-none', soon && 'cursor-default')}
    >
      {chapter.thisWeek && <span className="rounded-full bg-reward px-2 py-0.5 text-[11px] font-extrabold text-ink shadow-soft">This week</span>}
      <span className="rounded-full transition group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-primary">
        <ChapterBadge chapter={chapter} size={chapter.thisWeek ? 58 : 50} />
      </span>
      {chapter.state === 'mastered' && (
        <span className="-mt-1 flex text-reward" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Star key={i} className={cn('h-3 w-3', i < Math.round((chapter.view.stars / Math.max(1, chapter.view.maxStars)) * 3) ? 'fill-current' : '')} />
          ))}
        </span>
      )}
      <span
        className={cn(
          'max-w-[118px] truncate sm:max-w-[150px] rounded-full px-2.5 py-1 text-[13px] font-extrabold shadow-soft',
          chapter.thisWeek || chapter.state === 'in-progress' ? 'bg-ink text-white' : soon ? 'bg-canvas-sunken text-ink-muted' : 'bg-white text-ink',
        )}
      >
        {label}
      </span>
    </button>
  );
}

const STEP_ICON: Record<TopicStep, typeof Play> = { watch: Play, play: Gamepad2, practice: Pencil };

export type NodeKind = { kind: 'topic'; view: TopicView; index: number; current: boolean; extension?: boolean } | { kind: 'make' } | { kind: 'trophy'; done: boolean; title: string };

/** StepNode (wireframe page 1 + S3): done (green tick + stars), current (gold, pulsing), locked (white + lock). */
export function PathNode({ node, onOpen, compact = false, numbered = false }: { node: NodeKind; onOpen: () => void; compact?: boolean; numbered?: boolean }) {
  let circle: ReactNode;
  let pill: string;
  let pillClass = 'bg-white text-ink';
  let name: string;
  if (node.kind === 'trophy') {
    circle = (
      <span className={cn('grid h-14 w-14 place-items-center rounded-full ring-4', node.done ? 'bg-reward text-ink ring-white' : 'bg-reward-soft text-reward-strong ring-reward/60')}>
        <Trophy className="h-7 w-7" aria-hidden="true" />
      </span>
    );
    pill = node.title;
    pillClass = 'bg-reward text-ink';
    name = `${node.title}${node.done ? ', earned' : ', master every topic to earn it'}`;
  } else if (node.kind === 'make') {
    circle = (
      <span className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-dashed border-primary bg-primary-soft text-primary-strong">
        <Box className="h-7 w-7" aria-hidden="true" />
      </span>
    );
    pill = 'Make with your kit';
    pillClass = 'bg-primary-soft text-primary-strong';
    name = 'Make with your kit, or try it at home';
  } else {
    const { view, index, current, extension } = node;
    const StepIcon = STEP_ICON[resumeStep(view.record)];
    pill = extension ? `Explore more · ${view.topic.title}` : `${index} · ${view.topic.title}`;
    if (view.state === 'locked') {
      circle = (
        <span className={cn('grid h-14 w-14 place-items-center rounded-full shadow-soft', numbered ? 'bg-ink/80 text-white' : 'bg-white text-ink-muted')}>
          {numbered ? <span className="font-display text-xl font-extrabold">{index}</span> : <Lock className="h-6 w-6" aria-hidden="true" />}
        </span>
      );
      pillClass = 'bg-white/90 text-ink-muted';
      name = `Topic ${index}, ${view.topic.title}, locked`;
    } else if (current) {
      circle = (
        <span className="grid h-[68px] w-[68px] animate-pulse-ring place-items-center rounded-full bg-reward text-ink shadow-lift ring-4 ring-white">
          {numbered ? <span className="font-display text-2xl font-extrabold">{index}</span> : <StepIcon className="h-8 w-8" aria-hidden="true" />}
        </span>
      );
      pillClass = 'bg-ink text-white';
      name = `Topic ${index}, ${view.topic.title}, up next`;
    } else if (view.state === 'completed') {
      circle = (
        <span className={cn('grid h-14 w-14 place-items-center rounded-full text-white shadow-soft ring-4 ring-white', view.needsPractice ? 'bg-[#E8833A]' : 'bg-success')}>
          <Check className="h-7 w-7" aria-hidden="true" />
        </span>
      );
      name = `Topic ${index}, ${view.topic.title}, ${view.needsPractice ? 'done, practise to reach 60 percent' : 'done'}, ${view.stars} stars`;
    } else {
      circle = (
        <span className={cn('grid h-14 w-14 place-items-center rounded-full shadow-soft', numbered ? 'bg-ink text-white' : 'bg-white text-primary-strong ring-2 ring-primary')}>
          {numbered ? <span className="font-display text-xl font-extrabold">{index}</span> : <StepIcon className="h-6 w-6" aria-hidden="true" />}
        </span>
      );
      name = `Topic ${index}, ${view.topic.title}, ${view.state === 'in-progress' ? 'in progress' : 'ready'}`;
    }
  }
  if (node.kind === 'topic' && node.extension) name += ', explore more';
  const stars = node.kind === 'topic' && node.view.state === 'completed' ? node.view.stars : null;
  return (
    <button type="button" onClick={onOpen} aria-label={name} className={cn('group flex items-center focus-visible:outline-none', compact ? 'w-full gap-3 text-left' : 'flex-col gap-1')}>
      <span className="rounded-full group-focus-visible:ring-4 group-focus-visible:ring-primary">{circle}</span>
      {stars !== null && !compact && (
        <span className="-mt-1 flex text-reward" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <Star key={i} className={cn('h-3.5 w-3.5', i < stars ? 'fill-current' : '')} />
          ))}
        </span>
      )}
      <span className={cn('truncate rounded-full px-2.5 py-1 font-extrabold shadow-soft', compact ? 'max-w-none flex-1 bg-transparent px-0 text-base shadow-none' : 'max-w-[130px] text-[13px] sm:max-w-[170px]', !compact && pillClass)}>
        {pill}
      </span>
    </button>
  );
}
