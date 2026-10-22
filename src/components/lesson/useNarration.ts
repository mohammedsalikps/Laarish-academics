import { useCallback, useEffect, useRef, useState } from 'react';
import type { NarrationCue } from '../../../shared/media/videoSpecs';

/** Index of the cue showing at time t (seconds), or -1. */
export function cueIndexAt(cues: readonly NarrationCue[], t: number): number {
  return cues.findIndex((c) => t >= c.startS && t < c.endS);
}

function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/**
 * Reads a silent video's caption cues aloud with the device voice.
 *
 * Each cue is spoken when the video reaches it. If the next cue arrives while
 * the previous one is still being read, the video holds (pauses) until the
 * narrator catches up, so speech and pictures stay together.
 */
export function useNarration(cues: readonly NarrationCue[] | undefined, getVideo: () => HTMLVideoElement | null) {
  const supported = speechSupported() && Boolean(cues?.length);
  const [enabled, setEnabled] = useState(true);
  const [holding, setHolding] = useState(false);
  const spoken = useRef(-1);
  const speaking = useRef(false);
  const pending = useRef<number | null>(null);
  const holdingRef = useRef(false);
  const utterance = useRef(0);
  const sayRef = useRef<(i: number) => void>(() => {});

  const release = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    void getVideo()?.play().catch(() => {});
  }, [getVideo]);

  const say = useCallback(
    (i: number) => {
      const cue = cues?.[i];
      if (!cue) return;
      const u = new SpeechSynthesisUtterance(cue.text);
      u.rate = 0.95;
      u.pitch = 1.05;
      const id = ++utterance.current;
      const done = () => {
        // Ignore late events from an utterance that was cancelled and replaced.
        if (id !== utterance.current || !speaking.current) return;
        speaking.current = false;
        const next = pending.current;
        pending.current = null;
        if (next !== null) sayRef.current(next);
        release();
      };
      u.onend = done;
      u.onerror = done;
      speaking.current = true;
      spoken.current = i;
      window.speechSynthesis.speak(u);
    },
    [cues, release],
  );

  useEffect(() => {
    sayRef.current = say;
  }, [say]);

  const silence = useCallback(() => {
    pending.current = null;
    speaking.current = false;
    utterance.current += 1;
    if (speechSupported()) window.speechSynthesis.cancel();
  }, []);

  /** Call on every timeupdate. */
  const onTime = useCallback(
    (t: number) => {
      if (!supported || !enabled || !cues) return;
      const i = cueIndexAt(cues, t);
      if (i < 0 || i <= spoken.current) return;
      if (speaking.current) {
        // Narrator is still reading: hold the picture until it catches up.
        pending.current = i;
        spoken.current = i;
        holdingRef.current = true;
        setHolding(true);
        getVideo()?.pause();
        return;
      }
      say(i);
    },
    [supported, enabled, cues, say, getVideo],
  );

  /** Call when the learner pauses (not when the narrator holds the video). */
  const onUserPause = useCallback(() => {
    if (holdingRef.current) return;
    // Repeat the interrupted sentence when playback resumes.
    if (speaking.current) spoken.current -= 1;
    silence();
  }, [silence]);

  /** The learner paused while the video was holding for the narrator: stop reading, stay paused. */
  const pauseHold = useCallback(() => {
    const next = pending.current;
    silence();
    // The sentence that was waiting is read when playback resumes.
    spoken.current = (next ?? spoken.current) - 1;
    holdingRef.current = false;
    setHolding(false);
  }, [silence]);

  /** Call when the learner seeks. */
  const onSeek = useCallback(() => {
    silence();
    spoken.current = -1;
    holdingRef.current = false;
    setHolding(false);
  }, [silence]);

  /** Stops reading and lets the video carry on (used when narration is switched off or muted). */
  const stop = useCallback(() => {
    silence();
    release();
  }, [silence, release]);

  const toggle = useCallback(() => {
    if (enabled) stop();
    setEnabled(!enabled);
  }, [enabled, stop]);

  useEffect(() => () => silence(), [silence]);

  return { supported, enabled, holding, isHolding: () => holdingRef.current, toggle, stop, pauseHold, onTime, onUserPause, onSeek };
}
