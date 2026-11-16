import { Hand, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ClassWorld } from '../pages/world/worldData';
import { percent } from '../pages/world/worldData';
import { cn } from '../lib/cn';
import { IslandCanvas, type OverlayPin } from './IslandCanvas';
import type { IslandScene, SceneStats } from './IslandScene';
import { useLiteMode } from './useLiteMode';
import { WorldChip } from './WorldChip';
import { WorldMap2D } from './WorldMap2D';
import { worldPath } from './paths';

const SHORT_NAMES: Record<string, string> = { mathematics: 'Maths', 'social-science': 'Social Science' };

/**
 * The world hub on Home (wireframe H1 / Z1): six islands in a ring joined by
 * rope bridges. Drag spins the ring; tapping an island or its chip flies the
 * camera in (1.2 s) and opens that world. In Lite mode it is the flat 2D map (X2).
 */
export function WorldHub({ worlds, className, evening = false }: { worlds: ClassWorld[]; className?: string; evening?: boolean }) {
  const navigate = useNavigate();
  const { lite, reason } = useLiteMode();
  const [failed, setFailed] = useState(false);
  const sceneRef = useRef<IslandScene | null>(null);
  const flying = useRef(false);
  const [stats, setStats] = useState<SceneStats | null>(null);
  const showPerf = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf');
  const [fps, setFps] = useState<number | null>(null);

  // `?perf` shows measured first-frame time and frame rate (for the engine test, not for children).
  useEffect(() => {
    if (!showPerf) return;
    const id = window.setInterval(() => setFps(sceneRef.current?.stats().fps ?? null), 1000);
    return () => window.clearInterval(id);
  }, [showPerf]);

  const open = useCallback(
    async (subjectId: string) => {
      if (flying.current) return;
      flying.current = true;
      try {
        await sceneRef.current?.flyToIsland(subjectId);
      } finally {
        flying.current = false;
        navigate(worldPath(subjectId), { state: { from: 'hub' } });
      }
    },
    [navigate],
  );

  const use3d = !lite && !failed;
  const pins: OverlayPin[] = worlds.map((w) => ({
    id: w.subject.id,
    anchor: (scene) => scene.hubAnchor(w.subject.id),
    node: <WorldChip theme={w.theme} label={SHORT_NAMES[w.subject.id] ?? w.subject.name} mastery={percent(w.mastery)} thisWeek={!!w.thisWeek} onOpen={() => void open(w.subject.id)} />,
  }));

  return (
    <section aria-labelledby="worlds-title" className={className}>
      <h2 id="worlds-title" className="sr-only">
        Your worlds
      </h2>
      {use3d ? (
        <IslandCanvas
          mode="hub"
          pins={pins}
          highlighted={worlds.filter((w) => w.thisWeek).map((w) => w.subject.id)}
          onIslandTap={(id) => void open(id)}
          onScene={(s) => (sceneRef.current = s)}
          onReady={setStats}
          onFail={() => setFailed(true)}
          label="Six subject worlds floating in the clouds, joined by rope bridges. Use the world buttons to open one."
          lighting={evening ? 'evening' : 'morning'}
          className={cn(
            'h-[300px] rounded-3xl shadow-soft sm:h-[340px] lg:h-[380px]',
            evening ? 'bg-[linear-gradient(180deg,#1d2a55_0%,#4b4a85_58%,#b98aa0_100%)]' : 'bg-[linear-gradient(180deg,#cfe6f2_0%,#f6e3cf_62%,#f8d9bd_100%)]',
          )}
        >
          <p className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink/70 px-3 py-1 text-xs font-bold text-white">
            <Hand className="h-3.5 w-3.5" aria-hidden="true" /> Drag to spin · Tap a world to fly in
          </p>
          {showPerf && stats && (
            <p className="absolute right-2 top-2 rounded-lg bg-ink/80 px-2 py-1 font-mono text-[11px] text-white" data-testid="hub-perf">
              first frame {stats.firstFrameMs} ms · {fps ?? '…'} fps · {stats.drawCalls} draws
            </p>
          )}
        </IslandCanvas>
      ) : (
        <div className="h-[260px] sm:h-[320px]">
          <WorldMap2D worlds={worlds} onOpen={(id) => navigate(worldPath(id))} />
        </div>
      )}
      {!use3d && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-ink-muted">
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          {failed ? 'Lite mode: 3D could not start on this device, so here is the map.' : reason === 'reduced-motion' ? 'Lite mode: no 3D while reduced motion is on.' : 'Lite mode: no 3D. A grown-up can change this.'}
        </p>
      )}
    </section>
  );
}
