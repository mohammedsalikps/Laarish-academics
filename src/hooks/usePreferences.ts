import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SPEECH_TAGS, pickVoice, textLanguage } from '../voice/speech';
import { useProgress } from '../state/ProgressProvider';

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduce(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(REDUCE_QUERY);
  mql.addEventListener?.('change', cb);
  return () => mql.removeEventListener?.('change', cb);
}

function systemPrefersReduced() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(REDUCE_QUERY).matches;
}

/** True when animations should be minimised (OS preference or the in-app setting). */
export function useReducedMotion(): boolean {
  const { state } = useProgress();
  const system = useSyncExternalStore(subscribeReduce, systemPrefersReduced, () => false);
  if (state.settings.motion === 'reduce') return true;
  if (state.settings.motion === 'full') return false;
  return system;
}

type Sfx = 'correct' | 'incorrect' | 'reward' | 'tap' | 'whoosh' | 'snap';

/**
 * Tiny synthesised sound effects (Web Audio), so no audio files are needed.
 * Sounds only play after a user gesture and when enabled in Settings.
 */
export function useSound() {
  const { state } = useProgress();
  const enabled = state.settings.sound;
  const ctxRef = useRef<AudioContext | null>(null);

  return useCallback(
    (kind: Sfx) => {
      if (!enabled || typeof window === 'undefined') return;
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        ctxRef.current ??= new Ctor();
        const ctx = ctxRef.current;
        if (ctx.state === 'suspended') void ctx.resume();
        const notes: Record<Sfx, [number, number][]> = {
          correct: [
            [523.25, 0],
            [783.99, 0.09],
          ],
          incorrect: [
            [311.13, 0],
            [261.63, 0.12],
          ],
          reward: [
            [659.25, 0],
            [880, 0.08],
            [1174.66, 0.16],
          ],
          tap: [[440, 0]],
          whoosh: [
            [220, 0],
            [330, 0.06],
          ],
          // A short metallic click, for a magnet snapping onto something.
          snap: [
            [1318.51, 0],
            [1975.53, 0.03],
          ],
        };
        for (const [freq, delay] of notes[kind]) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = kind === 'incorrect' || kind === 'snap' ? 'triangle' : 'sine';
          osc.frequency.value = freq;
          const t = ctx.currentTime + delay;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(kind === 'tap' ? 0.05 : 0.12, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
          osc.connect(gain).connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.25);
        }
      } catch {
        /* audio is optional */
      }
    },
    [enabled],
  );
}

const synthesisSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

/* The device's voices load asynchronously in some browsers ("voiceschanged"). */
const NO_VOICES: SpeechSynthesisVoice[] = [];
let voiceCache: SpeechSynthesisVoice[] = NO_VOICES;

function refreshVoices() {
  try {
    const next = window.speechSynthesis.getVoices();
    // Keep the same array while nothing changed, so React does not re-render for nothing.
    if (next.length !== voiceCache.length || next.some((v, i) => v.voiceURI !== voiceCache[i]?.voiceURI)) voiceCache = next;
  } catch {
    /* voices are optional */
  }
}

function subscribeVoices(onChange: () => void) {
  if (!synthesisSupported()) return () => {};
  const synth = window.speechSynthesis;
  const handler = () => {
    refreshVoices();
    onChange();
  };
  synth.addEventListener?.('voiceschanged', handler);
  refreshVoices();
  return () => synth.removeEventListener?.('voiceschanged', handler);
}

/** The device voices, updated when the browser finishes loading them. */
export function useVoices(): readonly SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribeVoices, voicesSnapshot, () => NO_VOICES);
}

/** The cached voices; read once on first use, so browsers that list voices straight away show them on the first render. */
function voicesSnapshot(): SpeechSynthesisVoice[] {
  if (voiceCache === NO_VOICES && synthesisSupported()) refreshVoices();
  return voiceCache;
}

/**
 * Text-to-speech using the browser's speechSynthesis, when available. The voice
 * is chosen from the script of the text (English, Hindi or Kannada; see
 * voice/speech.ts). `canSpeak` is false when the device has no voice for it.
 */
export function useSpeech() {
  const supported = synthesisSupported();
  const voices = useVoices();
  const [speaking, setSpeaking] = useState(false);
  const mine = useRef(false);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    mine.current = false;
    setSpeaking(false);
  }, [supported]);

  const voiceFor = useCallback((text: string) => pickVoice(voices, textLanguage(text)), [voices]);

  const canSpeak = useCallback((text: string) => supported && (textLanguage(text) === 'en' || voiceFor(text) !== null), [supported, voiceFor]);

  /** Reads the text aloud. Returns false when it cannot (no speech, or no voice for its language). */
  const speak = useCallback(
    (text: string): boolean => {
      if (!canSpeak(text)) return false;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voice = voiceFor(text);
      u.lang = voice?.lang ?? SPEECH_TAGS[textLanguage(text)];
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.pitch = 1.1;
      const done = () => {
        mine.current = false;
        setSpeaking(false);
      };
      u.onend = done;
      u.onerror = done;
      mine.current = true;
      setSpeaking(true);
      window.speechSynthesis.speak(u);
      return true;
    },
    [canSpeak, voiceFor],
  );

  // Leaving the screen stops only speech this component started.
  useEffect(
    () => () => {
      if (mine.current && supported) window.speechSynthesis?.cancel();
    },
    [supported],
  );

  return { supported, speaking, speak, stop, canSpeak };
}
