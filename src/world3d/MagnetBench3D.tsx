import { useEffect, useLayoutEffect, useRef, useState, type Ref } from 'react';
import type { BenchObject, MagnetBenchScene } from './MagnetBenchScene';

/**
 * The 3D lab bench for the magnet experiment (wireframe L2 / Z4). three.js
 * loads with it; if WebGL fails, `onFail` switches the game back to its 2D
 * bench. An invisible box over the scene stays the drop zone for the object
 * cards, so dragging a card onto the bench still tests it.
 */
export function MagnetBench3D({
  row,
  atMagnet,
  reducedMotion,
  label,
  onTest,
  onFail,
  zoneRef,
  over,
}: {
  row: BenchObject[];
  atMagnet: { object: BenchObject; pulled: boolean; testKey: string } | null;
  reducedMotion: boolean;
  label: string;
  onTest: (objectId: string) => void;
  onFail: () => void;
  zoneRef: Ref<SVGRectElement>;
  over: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<MagnetBenchScene | null>(null);
  const handlers = useRef({ onTest, onFail });
  useLayoutEffect(() => {
    handlers.current = { onTest, onFail };
  });

  useEffect(() => {
    let created: MagnetBenchScene | null = null;
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    import('./MagnetBenchScene')
      .then(({ MagnetBenchScene }) => {
        if (cancelled || !canvasRef.current) return;
        created = new MagnetBenchScene(canvasRef.current, { reducedMotion, onTest: (id) => handlers.current.onTest(id) });
        setScene(created);
        observer = new ResizeObserver(() => created?.resize());
        observer.observe(canvasRef.current);
      })
      .catch(() => !cancelled && handlers.current.onFail());
    return () => {
      cancelled = true;
      observer?.disconnect();
      created?.dispose();
    };
    // Created once; motion and objects are pushed in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => scene?.setReducedMotion(reducedMotion), [scene, reducedMotion]);
  const rowKey = row.map((o) => o.id).join('|');
  const atKey = atMagnet ? `${atMagnet.object.id}:${atMagnet.testKey}:${atMagnet.pulled}` : '';
  useEffect(() => {
    scene?.update(row, atMagnet);
    // Keys capture everything the scene needs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, rowKey, atKey]);

  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-xl overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#e8f4f1_0%,#f6efe2_100%)] shadow-soft">
      <canvas ref={canvasRef} role="img" aria-label={label} className="absolute inset-0 h-full w-full touch-none select-none" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <rect ref={zoneRef} data-drop-zone="magnet" x="0" y="0" width="100%" height="100%" fill={over ? 'rgb(15 116 121 / 0.12)' : 'transparent'} />
      </svg>
      <p className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/85 px-3 py-1 text-xs font-extrabold text-ink shadow-soft">
        Drag an object to the magnet, or tap it
      </p>
    </div>
  );
}
