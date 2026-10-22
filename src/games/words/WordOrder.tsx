import { ArrowRight, Check, Eraser, Hand, Lightbulb, RotateCcw, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import type { WordOrderConfig } from '../../domain/types';
import { useSound, useSpeech } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { beginPointerDrag, type MiniGameProps } from '../framework';
import { createWordOrder, insertIndex, sentenceText, wordOrderResult } from './wordOrderLogic';

const DRAG_THRESHOLD = 6;

interface Drag {
  tileId: string;
  from: 'tray' | 'strip';
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

/** Sentence Builder: tap or drag word tiles into order to build a sentence. */
export default function WordOrder({ config, attempt, reducedMotion, onEvent, onComplete, onRestart }: MiniGameProps<WordOrderConfig>) {
  const { initial, reducer } = useMemo(() => createWordOrder(config, attempt), [config, attempt]);
  const [state, dispatch] = useReducer(reducer, initial);
  const play = useSound();
  const speech = useSpeech();
  const round = config.rounds[state.roundIndex];
  const stripRef = useRef<HTMLOListElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const suppressClick = useRef(false);
  const callbacks = useRef({ onEvent, onComplete });
  useEffect(() => {
    callbacks.current = { onEvent, onComplete };
  }, [onEvent, onComplete]);

  useEffect(() => {
    callbacks.current.onEvent({ key: 'start' });
  }, []);

  const lastStatus = useRef(state.status);
  useEffect(() => {
    if (state.status === lastStatus.current) return;
    lastStatus.current = state.status;
    if (state.status === 'correct') {
      play('correct');
      callbacks.current.onEvent({ key: 'sentence-correct' });
    } else if (state.status === 'wrong') {
      play('incorrect');
      callbacks.current.onEvent({ key: state.wrongChecks >= 2 ? 'sentence-hint' : 'sentence-incorrect' });
    } else if (state.status === 'finished') {
      const result = wordOrderResult(config, state);
      play('reward');
      callbacks.current.onEvent({ key: result.perfect ? 'complete:perfect' : 'complete' });
      callbacks.current.onComplete(result);
    }
  }, [state, config, play]);

  const textOf = (id: string) => state.tiles.find((t) => t.id === id)?.text ?? '';
  const placedWords = state.placed.map(textOf);
  const tray = state.tiles.filter((t) => !state.placed.includes(t.id));
  const editable = state.status === 'building' || state.status === 'wrong';
  const firstMove = state.roundIndex === 0 && state.placed.length === 0 && state.status === 'building';

  const place = (tileId: string, at?: number) => {
    if (!editable) return;
    dispatch({ type: 'place', tileId, at });
    play('tap');
    if (state.placed.length === 0) callbacks.current.onEvent({ key: 'tile-placed' });
  };
  const remove = (tileId: string) => {
    if (!editable) return;
    dispatch({ type: 'remove', tileId });
    play('tap');
  };
  const move = (tileId: string, at: number) => {
    dispatch({ type: 'remove', tileId });
    dispatch({ type: 'place', tileId, at });
  };

  /* -------------------------------------------------------- dragging tiles */
  const startDrag = (e: ReactPointerEvent<HTMLButtonElement>, tileId: string, from: Drag['from']) => {
    if (!editable || e.button !== 0) return;
    suppressClick.current = false;
    beginPointerDrag(e);
    setDrag({ tileId, from, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false });
  };
  const moveDrag = (e: ReactPointerEvent) => {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_THRESHOLD;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  };
  const endDrag = (e: ReactPointerEvent) => {
    if (!drag) return;
    setDrag(null);
    if (!drag.moved) return; // a tap: the click handler does the work
    // Ignore the click the browser may send after a drag (it arrives before any timer).
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
    const strip = stripRef.current;
    const box = strip?.getBoundingClientRect();
    const overStrip = box && e.clientX >= box.left - 12 && e.clientX <= box.right + 12 && e.clientY >= box.top - 12 && e.clientY <= box.bottom + 12;
    if (overStrip && strip) {
      const rects = [...strip.querySelectorAll<HTMLElement>('[data-placed-tile]')].filter((el) => el.dataset.tileId !== drag.tileId).map((el) => el.getBoundingClientRect());
      const at = insertIndex(rects, e.clientX, e.clientY);
      if (drag.from === 'tray') place(drag.tileId, at);
      else move(drag.tileId, at);
    } else if (drag.from === 'strip') remove(drag.tileId);
  };
  const onTileClick = (tileId: string, from: Drag['from']) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (from === 'tray') place(tileId);
    else remove(tileId);
  };
  const onPlacedKey = (e: KeyboardEvent<HTMLButtonElement>, tileId: string, index: number) => {
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      move(tileId, index - 1);
    } else if (e.key === 'ArrowRight' && index < state.placed.length - 1) {
      e.preventDefault();
      move(tileId, index + 1);
    }
  };

  if (state.status === 'finished') {
    const result = wordOrderResult(config, state);
    return (
      <div className="card animate-pop-in p-6 text-center" role="status">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
          <Check className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="font-display text-2xl font-semibold">Every sentence is built!</p>
        <p className="mt-1 text-ink-soft">
          {result.correct} of {result.total} right on the first try{result.perfect ? '. Perfect!' : '.'}
        </p>
        <button type="button" className="btn btn-secondary mt-5" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Play again
        </button>
      </div>
    );
  }

  const slots = Math.max(round.words.length, state.placed.length);
  const wrongFrom = state.status === 'wrong' ? state.firstWrong : null;

  return (
    <div className="space-y-4" onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={() => setDrag(null)} onDragStart={(e) => e.preventDefault()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">
          Sentence {state.roundIndex + 1} of {config.rounds.length}
        </p>
        <ol className="flex gap-1.5" aria-label="Sentences">
          {config.rounds.map((r, i) => (
            <li key={r.id} className={cn('h-2.5 w-7 rounded-full', i < state.roundIndex || (i === state.roundIndex && state.status === 'correct') ? 'bg-success' : i === state.roundIndex ? 'bg-primary' : 'bg-ink/10')}>
              <span className="sr-only">{i < state.roundIndex ? `Sentence ${i + 1} done` : `Sentence ${i + 1}`}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="flex items-center gap-3">
        {round.icon && (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary" aria-hidden="true">
            <Icon name={round.icon} width={24} height={24} />
          </span>
        )}
        <span className="font-display text-lg font-semibold leading-snug">
          <span className="sr-only">Picture clue: </span>
          {round.clue}
        </span>
      </p>

      {/* sentence strip */}
      <div>
        <p className="mb-2 text-sm font-extrabold text-ink-soft" id="strip-label">
          Your sentence {editable && state.placed.length > 0 && <span className="font-semibold text-ink-muted">· tap a word to send it back, or drag to move it</span>}
        </p>
        <ol
          ref={stripRef}
          aria-labelledby="strip-label"
          className={cn(
            'flex min-h-[84px] flex-wrap items-center gap-2 rounded-3xl border-2 border-dashed p-3 transition',
            state.status === 'correct' ? 'border-success bg-success-soft' : drag?.moved ? 'border-primary bg-primary-soft/60' : 'border-line bg-surface',
          )}
        >
          {Array.from({ length: slots }, (_, i) => {
            const id = state.placed[i];
            if (!id) {
              return (
                <li key={`slot-${i}`} aria-hidden="true" className={cn('h-14 min-w-[64px] rounded-2xl border-2 border-dotted border-line', i === state.placed.length && editable && 'border-primary/60')} />
              );
            }
            const wrong = wrongFrom !== null && i >= wrongFrom;
            return (
              <li key={id} data-placed-tile data-tile-id={id} className={cn(drag?.tileId === id && drag.moved && 'opacity-30')}>
                <button
                  type="button"
                  onClick={() => onTileClick(id, 'strip')}
                  onPointerDown={(e) => startDrag(e, id, 'strip')}
                  onKeyDown={(e) => onPlacedKey(e, id, i)}
                  disabled={!editable}
                  aria-label={`Word ${i + 1}: ${textOf(id)}. Press to send it back. Use the arrow keys to move it.`}
                  className={cn(
                    'h-14 min-w-[56px] touch-none select-none rounded-2xl border-2 px-4 font-display text-2xl font-semibold shadow-soft transition',
                    state.status === 'correct' ? 'border-success bg-surface text-success-strong' : wrong ? 'border-coral bg-coral-soft text-coral-strong' : 'border-primary/40 bg-surface text-ink',
                    wrong && !reducedMotion && i === wrongFrom && 'animate-shake',
                  )}
                >
                  {textOf(id)}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* tile tray */}
      <div className={cn('rounded-3xl bg-canvas-sunken p-3 transition', firstMove && 'ring-4 ring-primary/30')}>
        <p className="mb-2 flex items-center gap-2 text-sm font-extrabold text-ink-soft">
          Word tiles
          {firstMove && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[0.7rem] text-white">
              <Hand className="h-3 w-3" aria-hidden="true" /> Start here: tap or drag the first word
            </span>
          )}
        </p>
        <ul className="flex min-h-[60px] flex-wrap gap-2" aria-label="Word tiles to use">
          {tray.map((t) => (
            <li key={t.id} className={cn(drag?.tileId === t.id && drag.moved && 'opacity-30')}>
              <button
                type="button"
                onClick={() => onTileClick(t.id, 'tray')}
                onPointerDown={(e) => startDrag(e, t.id, 'tray')}
                disabled={!editable}
                aria-label={`Add "${t.text}" to the sentence`}
                className="h-14 min-w-[56px] touch-none select-none rounded-2xl border-2 border-line bg-surface px-4 font-display text-2xl font-semibold text-ink shadow-soft transition hover:-translate-y-0.5 hover:border-primary/50 disabled:opacity-50"
              >
                {t.text}
              </button>
            </li>
          ))}
          {tray.length === 0 && <li className="self-center text-sm font-bold text-ink-muted">All tiles used. Press Check!</li>}
        </ul>
      </div>

      <div aria-live="polite" className="min-h-[3rem]">
        {state.status === 'correct' && (
          <div className="animate-fade-up rounded-2xl bg-success-soft px-4 py-3">
            <p className="flex items-start gap-2 font-bold text-success-strong">
              <Check className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> “{sentenceText(placedWords)}”
            </p>
            <p className="mt-1 text-[0.98rem] text-ink-soft">{round.explanation}</p>
          </div>
        )}
        {state.status === 'wrong' && (
          <div className="animate-fade-up rounded-2xl bg-reward-soft px-4 py-3">
            <p className="font-bold text-reward-strong">
              {state.wrongChecks >= 2
                ? 'Not quite. The words at the start are right, so they stayed. Keep going!'
                : wrongFrom !== null && wrongFrom < placedWords.length
                  ? `Not quite. Look again at word ${wrongFrom + 1}.`
                  : 'Not quite. Is a word missing?'}
            </p>
            {state.wrongChecks >= 2 && (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-soft">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-reward-strong" aria-hidden="true" />
                {round.hint}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {state.status === 'correct' ? (
          <button type="button" className="btn btn-primary btn-lg" onClick={() => dispatch({ type: 'next' })}>
            {state.roundIndex >= config.rounds.length - 1 ? 'Finish' : 'Next sentence'} <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className="btn btn-success btn-lg" onClick={() => dispatch({ type: 'check' })} disabled={state.placed.length === 0}>
            Check
          </button>
        )}
        {speech.supported && state.placed.length > 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => speech.speak(sentenceText(placedWords))}>
            <Volume2 className="h-4 w-4" aria-hidden="true" /> Hear it
          </button>
        )}
        {editable && state.placed.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'clear' })}>
            <Eraser className="h-4 w-4" aria-hidden="true" /> Clear
          </button>
        )}
      </div>

      {drag?.moved && (
        <div
          className="pointer-events-none fixed z-50 rounded-2xl border-2 border-primary bg-surface px-4 py-2.5 font-display text-2xl font-semibold text-ink shadow-lift"
          style={{ left: drag.x, top: drag.y, transform: 'translate(-50%, -60%) rotate(-3deg)' }}
          aria-hidden="true"
        >
          {textOf(drag.tileId)}
        </div>
      )}
    </div>
  );
}
