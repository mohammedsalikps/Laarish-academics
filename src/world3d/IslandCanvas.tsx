import type { ReactNode, RefObject } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Vector3 } from 'three';
import { useReducedMotion } from '../hooks/usePreferences';
import { cn } from '../lib/cn';
import type { IslandStyle } from './islands';
import type { CameraPose, IslandScene, PinScreen, SceneMode, SceneStats } from './IslandScene';
import { separatePins, type Area, type PinBox } from './pinLayout';

export interface OverlayPin {
  id: string;
  node: ReactNode;
  anchor: (scene: IslandScene) => Vector3;
}

/**
 * Hosts an IslandScene and lays HTML pins over it. three.js is loaded only
 * when a 3D view is actually shown, so Lite mode never downloads it. If WebGL
 * fails for any reason, `onFail` lets the page switch to Lite mode.
 */
export function IslandCanvas({
  mode,
  style,
  pins,
  highlighted,
  path,
  focus,
  onIslandTap,
  onScene,
  onReady,
  onFail,
  label,
  className,
  safeTop = 0,
  avoid,
  lift = true,
  lighting = 'morning',
  children,
}: {
  mode: SceneMode;
  style?: IslandStyle;
  pins: OverlayPin[];
  highlighted?: readonly string[];
  /** World mode: topic path points (chapter path, Z3). */
  path?: (scene: IslandScene) => Vector3[] | null;
  /** Camera pose to rest at (e.g. near zoom on a chapter). */
  focus?: (scene: IslandScene) => CameraPose | null;
  onIslandTap?: (subjectId: string) => void;
  onScene?: (scene: IslandScene | null) => void;
  onReady?: (stats: SceneStats) => void;
  onFail: () => void;
  /** Accessible name for the 3D view. */
  label: string;
  /** Pixels at the top covered by other UI; pins stay below it. */
  safeTop?: number;
  /** Other UI laid over the canvas (e.g. the mentor and their speech bubble): pins keep clear of it. */
  avoid?: RefObject<HTMLElement | null>[];
  /** World mode on tall screens: lower the island below the header (off for the chapter path). */
  lift?: boolean;
  lighting?: 'morning' | 'evening';
  className?: string;
  children?: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinRefs = useRef(new Map<string, HTMLDivElement>());
  const sceneRef = useRef<IslandScene | null>(null);
  const [scene, setScene] = useState<IslandScene | null>(null);
  const [ready, setReady] = useState(false);
  const reducedMotion = useReducedMotion();
  const latest = useRef({ onIslandTap, onReady, onFail, onScene, safeTop, avoid });
  useLayoutEffect(() => {
    latest.current = { onIslandTap, onReady, onFail, onScene, safeTop, avoid };
  });

  // Create the scene once per mode/island.
  useEffect(() => {
    let cancelled = false;
    let created: IslandScene | null = null;
    let observer: ResizeObserver | null = null;
    import('./IslandScene')
      .then(({ IslandScene }) => {
        if (cancelled || !canvasRef.current) return;
        created = new IslandScene(canvasRef.current, {
          mode,
          style,
          reducedMotion,
          lighting,
          onIslandTap: (id) => latest.current.onIslandTap?.(id),
          onReady: (stats) => {
            setReady(true);
            latest.current.onReady?.(stats);
          },
          onPins: (screens: Map<string, PinScreen>) => {
            // Read every pin's size first (one layout), then move them apart where they overlap, then write.
            const boxes: PinBox[] = [];
            for (const [id, s] of screens) {
              const el = pinRefs.current.get(id);
              if (el) boxes.push({ id, x: s.x, y: s.y, w: el.offsetWidth, h: el.offsetHeight, depth: s.depth, visible: s.visible });
            }
            const canvas = canvasRef.current;
            const frame = canvas?.getBoundingClientRect();
            const covered: Area[] = [];
            for (const ref of latest.current.avoid ?? []) {
              const r = ref.current?.getBoundingClientRect();
              if (r && frame) covered.push({ left: r.left - frame.left, top: r.top - frame.top, right: r.right - frame.left, bottom: r.bottom - frame.top });
            }
            const placed = separatePins(boxes, { width: canvas?.clientWidth ?? 0, height: canvas?.clientHeight ?? 0, top: latest.current.safeTop, avoid: covered });
            for (const box of boxes) {
              const el = pinRefs.current.get(box.id)!;
              const p = placed.get(box.id)!;
              el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
              el.style.visibility = box.visible ? 'visible' : 'hidden';
              el.style.zIndex = String(10 + Math.round((1 - box.depth) * 50));
            }
          },
        });
        sceneRef.current = created;
        setScene(created);
        latest.current.onScene?.(created);
        observer = new ResizeObserver(() => created?.resize());
        observer.observe(canvasRef.current);
      })
      .catch(() => {
        if (!cancelled) latest.current.onFail();
      });
    return () => {
      cancelled = true;
      observer?.disconnect();
      created?.dispose();
      sceneRef.current = null;
      latest.current.onScene?.(null);
    };
    // reducedMotion is applied live below; recreating the scene for it would restart the fly-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, style]);

  useEffect(() => {
    scene?.setReducedMotion(reducedMotion);
  }, [scene, reducedMotion]);

  useEffect(() => {
    scene?.setLiftEnabled(lift);
  }, [scene, lift]);

  const pinKey = pins.map((p) => p.id).join('|');
  useEffect(() => {
    if (!scene) return;
    scene.setPins(pins.map((p) => ({ id: p.id, position: p.anchor(scene) })));
    // Pins are identified by id; anchors are pure functions of the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, pinKey]);

  useEffect(() => {
    if (!scene || !path) return;
    scene.setPath(path(scene));
    return () => scene.setPath(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, pinKey]);

  useEffect(() => {
    if (!scene || !focus) return;
    const pose = focus(scene);
    if (pose) void scene.setRest(pose, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, pinKey]);

  const highlightKey = (highlighted ?? []).join('|');
  useEffect(() => {
    scene?.setHighlighted(highlighted ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, highlightKey]);

  return (
    // `isolate` keeps the pins' z-index inside this box, under dialogs and sheets.
    <div className={cn('isolate overflow-hidden', !/\b(absolute|fixed)\b/.test(className ?? '') && 'relative', className)}>
      <canvas ref={canvasRef} role="img" aria-label={label} className="absolute inset-0 h-full w-full touch-none select-none" />
      {/* Pins: real buttons over the scene, in syllabus order for keyboards and screen readers. */}
      <div className="pointer-events-none absolute inset-0">
        {pins.map((p) => (
          <div
            key={p.id}
            ref={(el) => {
              if (el) pinRefs.current.set(p.id, el);
              else pinRefs.current.delete(p.id);
            }}
            className="pointer-events-auto absolute left-0 top-0"
            style={{ visibility: 'hidden' }}
          >
            {p.node}
          </div>
        ))}
      </div>
      {!ready && <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-white/30 to-white/0" aria-hidden="true" />}
      {children}
    </div>
  );
}
