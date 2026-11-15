import type { ClassWorld } from '../pages/world/worldData';
import { percent } from '../pages/world/worldData';
import { WorldIcon } from './WorldChip';
import { WORLDS } from './worlds';

/**
 * Lite mode hub (wireframe X2): the six worlds as tinted circles joined by a
 * dotted trail on a flat map. Same worlds data as the 3D hub; no 3D, no camera
 * flights. The island holding this week's chapter gets a gold halo.
 */
export function WorldMap2D({ worlds, onOpen }: { worlds: ClassWorld[]; onOpen: (subjectId: string) => void }) {
  const byId = new Map(worlds.map((w) => [w.subject.id, w]));
  const ordered = WORLDS.map((t) => byId.get(t.subjectId)).filter((w): w is ClassWorld => !!w);
  const trail = ordered.map((w) => `${w.theme.map.x},${w.theme.map.y}`).join(' ');
  return (
    <div className="relative h-full min-h-[230px] w-full overflow-hidden rounded-3xl bg-[#EAF4F1]" role="group" aria-label="Your worlds, 2D map">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polygon points={trail} fill="none" stroke="#9CC9C0" strokeWidth="0.8" strokeDasharray="1.6 1.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <ul className="absolute inset-0">
        {ordered.map((w) => {
          const m = percent(w.mastery);
          const label = w.subject.id === 'social-science' ? 'Social Sci' : w.subject.name;
          return (
            <li key={w.subject.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${w.theme.map.x}%`, top: `${w.theme.map.y}%` }}>
              <button
                type="button"
                onClick={() => onOpen(w.subject.id)}
                className="group flex min-h-[56px] min-w-[56px] flex-col items-center gap-1 rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary"
                aria-label={`${w.theme.name}, ${w.subject.name}: ${m}% mastery${w.thisWeek ? ', this week in school' : ''}. Open world`}
              >
                <span className={`rounded-full p-1 ${w.thisWeek ? 'bg-reward/40 ring-4 ring-reward/50' : ''}`}>
                  <WorldIcon theme={w.theme} size={44} className="shadow-soft transition group-hover:scale-105" />
                </span>
                <span className="whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-extrabold text-ink shadow-soft">
                  {label} · {m}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
