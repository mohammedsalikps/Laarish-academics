import { Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ExplainerScene } from '../../domain/types';
import { useSpeech } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { useProgress } from '../../state/ProgressProvider';
import { Illustration } from '../art/Illustration';

/**
 * Built-in animated explainer: a narrated sequence of illustrated scenes with
 * captions. Used when no lesson video is configured, or when the video fails.
 */
export function ExplainerPlayer({ scenes, onProgress }: { scenes: ExplainerScene[]; onProgress: (fraction: number) => void }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const { state } = useProgress();
  const speech = useSpeech();
  const [narrate, setNarrate] = useState(state.settings.readAloud);
  const furthest = useRef(0);
  const scene = scenes[index];

  // Report the furthest point reached.
  useEffect(() => {
    const f = done ? 1 : (index + Math.min(1, elapsed / scene.durationMs)) / scenes.length;
    if (f > furthest.current) {
      furthest.current = f;
      onProgress(f);
    }
  }, [index, elapsed, done, scene.durationMs, scenes.length, onProgress]);

  // Advance through scenes while playing.
  useEffect(() => {
    if (!playing) return;
    const started = performance.now() - elapsed;
    const timer = window.setInterval(() => {
      const e = performance.now() - started;
      if (e >= scene.durationMs) {
        window.clearInterval(timer);
        if (index < scenes.length - 1) {
          setIndex((i) => i + 1);
          setElapsed(0);
        } else {
          setElapsed(scene.durationMs);
          setPlaying(false);
          setDone(true);
        }
      } else {
        setElapsed(e);
      }
    }, 100);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index]);

  // Narrate each scene when narration is on.
  const { speak, stop, supported } = speech;
  useEffect(() => {
    if (playing && narrate && supported) speak(scene.caption);
  }, [playing, narrate, supported, speak, scene.caption]);
  useEffect(() => {
    if (!playing) stop();
  }, [playing, stop]);

  const go = (i: number) => {
    setIndex(Math.max(0, Math.min(scenes.length - 1, i)));
    setElapsed(0);
    setDone(false);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-lift">
      <div className="relative">
        <Illustration key={scene.id} spec={scene.illustration} className="aspect-video animate-fade-in rounded-none sm:aspect-[16/8]" label={scene.caption} />
        <span className="absolute left-3 top-3 chip bg-surface/90 text-xs text-ink-soft shadow-soft">Animated explainer</span>
        {!playing && !done && index === 0 && elapsed === 0 && (
          <button type="button" className="absolute inset-0 grid place-items-center bg-ink/10" onClick={() => setPlaying(true)} aria-label="Play explainer">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-primary text-white shadow-float">
              <Play className="ml-1 h-9 w-9 fill-current" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
      <p className="min-h-[4.5rem] border-t border-line bg-ink px-5 py-4 text-center text-[1.05rem] font-bold leading-snug text-white" aria-live="polite">
        {scene.caption}
      </p>
      <div className="flex gap-1 px-4 pt-3" aria-hidden="true">
        {scenes.map((s, i) => (
          <div key={s.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-primary" style={{ width: `${i < index || done ? 100 : i === index ? Math.min(100, (elapsed / scene.durationMs) * 100) : 0}%` }} />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-ghost !min-h-[44px] !px-3" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous scene">
            <SkipBack className="h-5 w-5" aria-hidden="true" />
          </button>
          {done ? (
            <button
              type="button"
              className="btn btn-primary !min-h-[44px]"
              onClick={() => {
                go(0);
                setPlaying(true);
              }}
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" /> Replay
            </button>
          ) : (
            <button type="button" className="btn btn-primary !min-h-[44px]" onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause className="h-5 w-5 fill-current" aria-hidden="true" /> : <Play className="h-5 w-5 fill-current" aria-hidden="true" />}
              {playing ? 'Pause' : 'Play'}
            </button>
          )}
          {/* On the last scene, "next" finishes the explainer, like seeking a video to its end. */}
          <button
            type="button"
            className="btn btn-ghost !min-h-[44px] !px-3"
            onClick={() => {
              if (index < scenes.length - 1) go(index + 1);
              else {
                setPlaying(false);
                setElapsed(scene.durationMs);
                setDone(true);
              }
            }}
            disabled={done}
            aria-label={index < scenes.length - 1 ? 'Next scene' : 'Finish the explainer'}
          >
            <SkipForward className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-ink-muted">
            Scene {index + 1} / {scenes.length}
          </span>
          {supported && (
            <button
              type="button"
              className={cn('btn btn-sm', narrate ? 'btn-secondary text-primary' : 'btn-ghost')}
              onClick={() => {
                if (narrate) stop();
                setNarrate((n) => !n);
              }}
              aria-pressed={narrate}
            >
              {narrate ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
              Narration
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
