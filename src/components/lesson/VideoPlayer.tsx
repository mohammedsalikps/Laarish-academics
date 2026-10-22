import { AudioLines, Captions, CaptionsOff, LoaderCircle, Maximize, Minimize, Pause, Play, RotateCcw, TriangleAlert, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { NarrationCue } from '../../../shared/media/videoSpecs';
import type { VideoAsset } from '../../domain/types';
import { cn } from '../../lib/cn';
import { cueIndexAt, useNarration } from './useNarration';

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

/** Shows or hides the first caption track of a video element. */
function setCaptionsMode(video: HTMLVideoElement | null, on: boolean) {
  const track = video?.textTracks?.[0];
  if (track) track.mode = on ? 'showing' : 'hidden';
}

const LOAD_ERROR = "This video can't be played right now. The link may be wrong, or your connection may be offline.";

/**
 * Accessible video player with custom controls: play/pause, seek, time,
 * replay, mute, captions (when a track exists), speed and fullscreen.
 * Handles slow loading, invalid URLs and playback errors.
 *
 * When the lesson's narration cues are known, captions are shown in a bar
 * under the picture (so they never cover on-screen labels) and can be read
 * aloud by the device voice, because the rendered lesson videos are silent.
 */
export function VideoPlayer({
  asset,
  cues,
  onProgress,
  onFallback,
}: {
  asset: VideoAsset & { src: string };
  /** Timed narration from the video's production spec. */
  cues?: readonly NarrationCue[];
  /** Furthest fraction (0-1) of the video watched so far. */
  onProgress: (fraction: number) => void;
  onFallback: () => void;
}) {
  const videoRef = useRef<FullscreenVideo>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const furthest = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const getVideo = useCallback(() => videoRef.current, []);
  const narration = useNarration(cues, getVideo);
  const showPlaying = playing || narration.holding;

  // Media errors can fire before React attaches its handlers (for example an
  // invalid URL that fails instantly), so listen natively and check on mount.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const fail = () => {
      setLoading(false);
      setError(LOAD_ERROR);
    };
    if (el.error || el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) fail();
    el.addEventListener('error', fail);
    return () => el.removeEventListener('error', fail);
  }, [asset.src]);

  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => setSlow(true), 12_000);
    return () => window.clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    // With known cues the caption bar shows the text, so the built-in track stays hidden.
    setCaptionsMode(videoRef.current, captions && !cues);
  }, [captions, loading, cues]);

  const v = () => videoRef.current;

  const toggle = async () => {
    const el = v();
    if (!el || error) return;
    if (narration.isHolding()) {
      // Paused while the narrator was catching up: stop reading and stay paused.
      narration.pauseHold();
      return;
    }
    if (el.paused || el.ended) {
      try {
        await el.play();
      } catch {
        setError('The video could not start. Please try again.');
      }
    } else el.pause();
  };

  const seek = (t: number) => {
    const el = v();
    if (!el || !Number.isFinite(el.duration)) return;
    narration.onSeek();
    el.currentTime = Math.min(Math.max(0, t), el.duration);
  };

  const retry = () => {
    setError(null);
    setLoading(true);
    setSlow(false);
    v()?.load();
  };

  const toggleFullscreen = async () => {
    const wrap = wrapRef.current;
    const el = v();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (wrap?.requestFullscreen) await wrap.requestFullscreen();
      else el?.webkitEnterFullscreen?.();
    } catch {
      /* fullscreen not allowed: ignore */
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const el = v();
    if (!el) return;
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        void toggle();
        break;
      case 'ArrowRight':
        e.preventDefault();
        seek(el.currentTime + 5);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        seek(el.currentTime - 5);
        break;
      case 'f':
        void toggleFullscreen();
        break;
      case 'c':
        setCaptions((c) => !c);
        break;
      case 'm':
        toggleMute();
        break;
    }
  };

  const toggleMute = () => {
    const el = v();
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (el.muted) narration.stop();
  };

  const hasCaptions = Boolean(asset.captionsSrc) || Boolean(cues?.length);
  const activeCue = cues ? cues[cueIndexAt(cues, time)] : undefined;

  return (
    <div
      ref={wrapRef}
      className={cn('group relative overflow-hidden rounded-3xl bg-ink shadow-lift outline-none', fullscreen && 'flex flex-col justify-center rounded-none')}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`Video player: ${asset.title}. Press space to play or pause.`}
      role="region"
    >
      <video
        ref={videoRef}
        className="aspect-video w-full bg-black"
        src={asset.src}
        poster={asset.poster}
        preload="metadata"
        playsInline
        crossOrigin={hasCaptions ? 'anonymous' : undefined}
        onClick={() => void toggle()}
        onError={() => {
          setLoading(false);
          setError(LOAD_ERROR);
        }}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          setLoading(false);
        }}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => {
          setLoading(false);
          setEnded(false);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          narration.onUserPause();
        }}
        onEnded={() => {
          setPlaying(false);
          setEnded(true);
          furthest.current = 1;
          onProgress(1);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setTime(el.currentTime);
          if (!el.muted) narration.onTime(el.currentTime);
          if (el.duration > 0) {
            const f = el.currentTime / el.duration;
            if (f > furthest.current) {
              furthest.current = f;
              onProgress(f);
            }
          }
        }}
      >
        {asset.captionsSrc && <track kind="captions" src={asset.captionsSrc} srcLang={asset.captionsLang ?? 'en'} label="English" default />}
      </video>

      {cues && captions && (
        <p className="flex min-h-[3.75rem] items-center justify-center bg-ink px-4 pt-2 text-center text-[1.02rem] font-bold leading-snug text-white sm:text-[1.12rem]" aria-hidden="true">
          {activeCue?.text ?? ''}
        </p>
      )}

      {narration.holding && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1 text-xs font-bold text-white" role="status">
          <AudioLines className="h-3.5 w-3.5" aria-hidden="true" /> Reading aloud…
        </span>
      )}

      {loading && !error && (
        <div className="absolute inset-0 grid place-items-center bg-ink/30" role="status">
          <div className="flex flex-col items-center gap-2 text-white">
            <LoaderCircle className="h-10 w-10 animate-spin" aria-hidden="true" />
            <span className="text-sm font-bold">{slow ? 'Still loading. Check your internet connection.' : 'Loading video...'}</span>
          </div>
        </div>
      )}

      {!loading && !showPlaying && !error && !ended && time === 0 && (
        <button type="button" onClick={() => void toggle()} className="absolute inset-0 grid place-items-center bg-ink/20" aria-label="Play video">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-surface text-primary shadow-float transition group-hover:scale-105">
            <Play className="ml-1 h-9 w-9 fill-current" aria-hidden="true" />
          </span>
        </button>
      )}

      {ended && !error && (
        <div className="absolute inset-0 grid place-items-center bg-ink/55">
          <button type="button" className="btn btn-primary btn-lg" 
            onClick={() => {
              seek(0);
              void v()?.play();
            }}
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" /> Watch again
          </button>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-ink/85 p-6 text-center text-white" role="alert">
          <div className="max-w-sm">
            <TriangleAlert className="mx-auto h-10 w-10 text-reward" aria-hidden="true" />
            <p className="mt-2 font-bold">{error}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Try again
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={onFallback}>
                Watch the animated explainer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 bg-ink px-2 py-2 text-white sm:gap-2 sm:px-3">
        <button type="button" onClick={() => void toggle()} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/10" aria-label={showPlaying ? 'Pause' : 'Play'} disabled={Boolean(error)}>
          {showPlaying ? <Pause className="h-5 w-5 fill-current" aria-hidden="true" /> : <Play className="h-5 w-5 fill-current" aria-hidden="true" />}
        </button>
        <span className="w-[86px] text-center text-xs font-bold tabular-nums sm:text-sm">
          {fmt(time)} / {fmt(duration)}
        </span>
        <input
          type="range"
          className="range-input order-last w-full min-w-0 sm:order-none sm:flex-1"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          aria-valuetext={`${fmt(time)} of ${fmt(duration)}`}
          disabled={!duration || Boolean(error)}
        />
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          {narration.supported && (
            <button
              type="button"
              onClick={narration.toggle}
              className={cn('grid h-11 w-11 place-items-center rounded-xl hover:bg-white/10', !narration.enabled && 'text-white/50')}
              aria-label="Read the narration aloud"
              aria-pressed={narration.enabled}
              title="Read the narration aloud"
            >
              <AudioLines className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={toggleMute} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/10" aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
          </button>
          {hasCaptions && (
            <button type="button" onClick={() => setCaptions((c) => !c)} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/10" aria-label={captions ? 'Hide captions' : 'Show captions'} aria-pressed={captions}>
              {captions ? <Captions className="h-5 w-5" aria-hidden="true" /> : <CaptionsOff className="h-5 w-5" aria-hidden="true" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const next = rate === 1 ? 0.75 : rate === 0.75 ? 1.25 : 1;
              setRate(next);
              if (v()) v()!.playbackRate = next;
            }}
            className="h-11 rounded-xl px-2 text-sm font-extrabold hover:bg-white/10"
            aria-label={`Playback speed ${rate} times. Change speed`}
          >
            {rate}x
          </button>
          <button type="button" onClick={() => void toggleFullscreen()} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/10" aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}>
            {fullscreen ? <Minimize className="h-5 w-5" aria-hidden="true" /> : <Maximize className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}
