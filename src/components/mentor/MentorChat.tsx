import { Info, RefreshCw, Send, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { suggestedPrompts } from '../../../shared/mentor/types';
import { getLesson, getSubject, getTopic } from '../../content';
import { MENTOR_LIMITS } from '../../../shared/mentor/safety';
import { useSpeech } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import { useMentor, type ChatMessage } from '../../mentor/MentorProvider';
import { useMentorPersona } from '../../mentor/useMentorPersona';
import { MentorAvatar } from './MentorAvatar';

export function MentorModeBadge() {
  const { status } = useMentor();
  const { name } = useMentorPersona();
  const live = status?.provider === 'claude';
  return (
    <span
      className={cn('chip text-xs', live ? 'bg-success-soft text-success-strong' : 'bg-reward-soft text-reward-strong')}
      title={
        live
          ? `Live AI: answers come from ${status?.model ?? 'Claude'} and can contain mistakes.`
          : status?.backend
            ? `Demo mode: no AI key is configured on the server, so ${name} uses prepared answers. It is not a live AI.`
            : `Demo mode: the mentor server is not reachable, so ${name} uses prepared answers on this device. It is not a live AI.`
      }
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', live ? 'bg-success' : 'bg-reward')} aria-hidden="true" />
      {live ? 'Live AI' : 'Demo mode'}
    </span>
  );
}

function Bubble({ m, onRetry, speech }: { m: ChatMessage; onRetry: (id: string) => void; speech: ReturnType<typeof useSpeech> }) {
  if (m.role === 'learner') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] animate-fade-up rounded-3xl rounded-br-lg bg-primary px-4 py-2.5 text-[0.98rem] font-semibold text-white">{m.text}</p>
      </div>
    );
  }
  const facts = m.facts?.length ? (
    <div className="mb-2 rounded-2xl bg-primary-soft/60 px-3.5 py-2.5">
      <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-primary-strong">From your progress</p>
      <ul className="mt-1 space-y-0.5 text-[0.92rem] font-semibold">
        {m.facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
    </div>
  ) : null;
  if (m.error) {
    return (
      <div className="flex animate-fade-up items-start gap-2">
        <MentorAvatar size={32} />
        <div className="max-w-[88%]">
          {facts}
          <div className="rounded-3xl rounded-tl-lg border border-coral/30 bg-coral-soft px-4 py-3" role="alert">
            <p className="text-[0.95rem] font-semibold text-coral-strong">{m.text}</p>
            {m.error.retryable && (
              <button type="button" onClick={() => onRetry(m.id)} className="btn btn-secondary btn-sm mt-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex animate-fade-up items-start gap-2">
      <MentorAvatar size={32} />
      <div className="max-w-[88%]">
        {facts}
        <div className="rounded-3xl rounded-tl-lg border border-line bg-surface px-4 py-2.5 shadow-soft">
          <p className="whitespace-pre-line text-[0.98rem] leading-relaxed">{m.text}</p>
        </div>
        <div className="mt-1 flex items-center gap-2 pl-2 text-xs text-ink-muted">
          {m.source === 'server' && m.provider === 'claude' && <span>Live AI</span>}
          {m.source === 'server' && m.provider === 'demo' && <span>Demo answer</span>}
          {m.source === 'local-demo' && <span>Demo answer (offline)</span>}
          {m.source === 'app' && <span>From the app</span>}
          {speech.supported && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-bold hover:bg-ink/5"
              onClick={() => (speech.speaking ? speech.stop() : speech.speak(m.text))}
              aria-label={speech.speaking ? 'Stop reading aloud' : 'Read this answer aloud'}
            >
              {speech.speaking ? <VolumeX className="h-3.5 w-3.5" aria-hidden="true" /> : <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />}
              {speech.speaking ? 'Stop' : 'Listen'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** The chat body: transcript, suggested prompts and the question box. */
export function MentorChat({ className, autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const { messages, pending, send, retry, context, contextIsDefault, failedQuestion } = useMentor();
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeech();
  const { name } = useMentorPersona();

  // If a question could not be answered, put it back in the box so nothing the child typed is lost.
  const [restored, setRestored] = useState<string | null>(null);
  if (failedQuestion && failedQuestion !== restored) {
    setRestored(failedQuestion);
    if (!draft) setDraft(failedQuestion);
  }

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, pending]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    if (!draft.trim() || pending) return;
    send(draft);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const over = draft.length > MENTOR_LIMITS.maxLearnerChars;
  const STEP_LABEL: Record<string, string> = { watch: 'Learn', play: 'Play', practice: 'Practice', complete: 'Complete' };
  const talkingAbout = [
    getSubject(context.subjectId)?.name,
    getTopic(context.topicId)?.title ?? getLesson(context.lessonId)?.title,
    context.step ? STEP_LABEL[context.step] : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
  const prompts = suggestedPrompts(context.step).slice(0, 4);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {talkingAbout && (
        <p className="mx-5 mb-1 truncate text-xs font-bold text-ink-muted sm:mx-6">
          {contextIsDefault ? 'Your current topic: ' : ''}
          {talkingAbout}
        </p>
      )}
      <div ref={listRef} className="min-h-[200px] flex-1 space-y-3 overflow-y-auto px-5 py-3 sm:px-6" role="log" aria-live="polite" aria-label={`Conversation with ${name}`}>
        {messages.map((m) => (
          <Bubble key={m.id} m={m} onRetry={retry} speech={speech} />
        ))}
        {pending && (
          <div className="flex items-center gap-2" role="status">
            <MentorAvatar size={32} mood="thinking" />
            <span className="text-sm font-bold text-ink-muted">{name} is thinking...</span>
          </div>
        )}
      </div>

      <div className="border-t border-line bg-canvas/60 px-4 pb-4 pt-3 sm:px-6">
        {!pending && (
          <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Suggested questions">
            {prompts.map((p) => (
              <button
                key={p.intent}
                type="button"
                onClick={() => send(p.label, p.intent)}
                className="min-h-[40px] shrink-0 rounded-full border border-primary/25 bg-surface px-3 py-1.5 text-sm font-bold text-primary-strong transition hover:bg-primary-soft"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="mentor-input" className="sr-only">
            Ask {name} a question
          </label>
          <div className="relative flex-1">
            <textarea
              id="mentor-input"
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Ask ${name} a question...`}
              maxLength={MENTOR_LIMITS.maxLearnerChars + 50}
              aria-describedby="mentor-help"
              className={cn(
                'block max-h-32 min-h-[48px] w-full resize-none rounded-2xl border-2 bg-surface px-4 py-3 pr-14 text-base outline-none transition focus:border-primary',
                over ? 'border-coral' : 'border-line',
              )}
            />
            <span className={cn('pointer-events-none absolute bottom-2 right-3 text-[0.7rem] font-bold', over ? 'text-coral-strong' : 'text-ink-muted')}>
              {draft.length}/{MENTOR_LIMITS.maxLearnerChars}
            </span>
          </div>
          <button type="submit" className="btn btn-primary !px-4" disabled={pending || !draft.trim() || over} aria-label="Send question">
            <Send className="h-5 w-5" aria-hidden="true" />
          </button>
        </form>
        <p id="mentor-help" className="mt-2 flex items-start gap-1.5 text-xs text-ink-muted">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {name} can make mistakes. Never share personal details like your address or phone number.
        </p>
      </div>
    </div>
  );
}
