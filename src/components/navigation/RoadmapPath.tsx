import { Check, Construction, Flag, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import type { IconKey } from '../../domain/types';
import { cn } from '../../lib/cn';
import { Icon } from '../ui/Icon';
import { ProgressRing, StarRow } from '../ui/primitives';

export type RoadmapNodeState = 'locked' | 'available' | 'in-progress' | 'completed' | 'in-development';

export interface RoadmapNodeData {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  state: RoadmapNodeState;
  icon: IconKey;
  stars?: number;
  /** 0-1, drawn as a ring on in-progress nodes. */
  progress?: number;
  /** Marks the recommended next node with a flag. */
  recommended?: boolean;
  recommendedLabel?: string;
  detail?: ReactNode;
  /** Starts a new labelled stretch of the path (for example a branch of a class). */
  section?: { id: string; title: string; detail?: string; icon?: IconKey };
  ariaLabel: string;
  onSelect: () => void;
}

/** Horizontal offsets (% of the path width) that make the path wind left and right. */
const OFFSETS = [-20, 18, 32, 14, -16, -30, -12, 22];
const ROW_H = 132;
const SECTION_H = 64;

interface Placed {
  node: RoadmapNodeData;
  /** Centre of the node: x in % of the width, y in px from the top. */
  x: number;
  y: number;
  /** Top of the node's row, and of its section label when it starts a section. */
  top: number;
  sectionTop?: number;
}

function layout(nodes: RoadmapNodeData[]): { placed: Placed[]; height: number } {
  let y = 0;
  const placed = nodes.map((node, i) => {
    const sectionTop = node.section ? y : undefined;
    if (node.section) y += SECTION_H;
    const top = y;
    y += ROW_H;
    return { node, x: 50 + OFFSETS[i % OFFSETS.length] * 0.9, y: top + ROW_H / 2, top, sectionTop };
  });
  return { placed, height: y };
}

/**
 * Connected, winding learning path shared by the subject overview (lessons of a
 * class, in labelled branch sections) and the lesson roadmap (topics). Nodes
 * are real buttons, in order; the path is decoration.
 */
export function RoadmapPath({ nodes, color, label }: { nodes: RoadmapNodeData[]; color: string; label: string }) {
  const { placed, height } = layout(nodes);
  const pathD = placed.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = placed[i - 1];
    const bend = (p.y - prev.y) / 2;
    return `${d} C ${prev.x} ${prev.y + bend}, ${p.x} ${p.y - bend}, ${p.x} ${p.y}`;
  }, '');
  return (
    <div className="relative" style={{ height }}>
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 100 ${Math.max(1, height)}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={pathD} fill="none" stroke={color} strokeOpacity="0.22" strokeWidth="14" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={pathD} fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <ol aria-label={label}>
        {placed.map((p) => (
          <RoadmapNode key={p.node.id} placed={p} color={color} />
        ))}
      </ol>
    </div>
  );
}

function RoadmapNode({ placed, color }: { placed: Placed; color: string }) {
  const { node, x, top, sectionTop } = placed;
  const { state } = node;
  const labelLeft = x > 55;
  const active = state === 'available' || state === 'in-progress';
  return (
    <li>
      {node.section && sectionTop !== undefined && (
        <div id={node.section.id} className="absolute left-0 right-0 flex scroll-mt-24 justify-center" style={{ top: sectionTop + 10 }}>
          <h3 className="flex max-w-[92%] items-center gap-2 rounded-full border-2 bg-surface px-3.5 py-1.5 shadow-soft" style={{ borderColor: `${color}55` }}>
            {node.section.icon && (
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: color }} aria-hidden="true">
                <Icon name={node.section.icon} width={15} height={15} />
              </span>
            )}
            <span className="min-w-0 truncate font-display text-[0.98rem] font-semibold">{node.section.title}</span>
            {node.section.detail && <span className="shrink-0 text-xs font-bold text-ink-muted">{node.section.detail}</span>}
          </h3>
        </div>
      )}
      <div className="absolute left-0 right-0" style={{ top, height: ROW_H }}>
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%` }}>
          {node.recommended && (
            <span className="absolute -top-9 left-1/2 flex -translate-x-1/2 animate-bob items-center gap-1 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-xs font-extrabold text-white shadow-lift">
              <Flag className="h-3.5 w-3.5" aria-hidden="true" /> {node.recommendedLabel ?? 'Start here'}
            </span>
          )}
          <button
            type="button"
            onClick={node.onSelect}
            aria-label={node.ariaLabel}
            className={cn(
              'relative grid h-[76px] w-[76px] place-items-center rounded-full border-[5px] border-surface shadow-lift transition hover:scale-105 focus-visible:scale-105',
              state === 'completed' && 'bg-success text-white',
              active && 'text-white',
              state === 'locked' && 'bg-[#E4E0EA] text-ink-muted',
              state === 'in-development' && 'border-dashed bg-canvas text-ink-muted',
              node.recommended && 'animate-pulse-ring',
            )}
            style={active ? { backgroundColor: color } : undefined}
          >
            {state === 'in-progress' && node.progress !== undefined && (
              <span className="absolute -inset-[5px]">
                <ProgressRing value={node.progress} size={76} stroke={5} tone="reward" label={`${Math.round(node.progress * 100)}% done`} />
              </span>
            )}
            {state === 'completed' ? (
              <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
            ) : state === 'locked' ? (
              <Lock className="h-7 w-7" aria-hidden="true" />
            ) : state === 'in-development' ? (
              <Construction className="h-7 w-7" aria-hidden="true" />
            ) : (
              <Icon name={node.icon} width={30} height={30} />
            )}
            <span className="absolute -bottom-2 left-1/2 grid h-6 min-w-6 -translate-x-1/2 place-items-center rounded-full bg-ink px-1.5 text-xs font-extrabold text-white">
              {node.number}
            </span>
          </button>
          <div
            className={cn('absolute top-1/2 w-[min(38vw,220px)] -translate-y-1/2', labelLeft ? 'right-[calc(100%+14px)] text-right' : 'left-[calc(100%+14px)]')}
            aria-hidden="true"
          >
            <p className="font-display text-[1.05rem] font-semibold leading-tight">{node.title}</p>
            <p className="mt-0.5 text-xs font-bold text-ink-muted">{node.subtitle}</p>
            {node.stars !== undefined && state === 'completed' && <StarRow stars={node.stars} max={3} size={14} className="mt-0.5" />}
            {node.detail && <div className={cn('mt-1 flex', labelLeft && 'justify-end')}>{node.detail}</div>}
          </div>
        </div>
      </div>
    </li>
  );
}
