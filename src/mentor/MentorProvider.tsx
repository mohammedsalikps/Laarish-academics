import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getLesson, getSubject, getTopic } from '../content';
import { getMentor } from '../../shared/mentor/personas';
import { MENTOR_LIMITS } from '../../shared/mentor/safety';
import { suggestedPrompts, type MentorContext, type MentorIntent, type MentorProviderName, type MentorRequest } from '../../shared/mentor/types';
import { createId } from '../lib/ids';
import { useProgress } from '../state/ProgressProvider';
import { nextActivity } from '../state/selectors';
import { buildProgressSummary, detectLocalQuestion, nameReply, progressFacts } from './localAnswers';
import { askMentor, fetchMentorStatus, toMentorMessages, type MentorClientError, type MentorStatusView } from './mentorClient';

/**
 * Mentor conversation state. Conversations are kept in memory only (one per
 * topic) and are never written to storage.
 */

export interface ChatMessage {
  id: string;
  role: 'learner' | 'mentor';
  text: string;
  intent?: MentorIntent;
  /** server: the mentor API; local-demo: on-device demo answers; app: answered from the app's own data (no AI). */
  source?: 'server' | 'local-demo' | 'app';
  provider?: MentorProviderName;
  flagged?: boolean;
  followUps?: string[];
  error?: MentorClientError;
  /** Exact facts from the app's progress data, shown above the reply. */
  facts?: string[];
  /** Shown on screen only and never sent to the server (e.g. anything containing the nickname). */
  localOnly?: boolean;
}

interface MentorContextValue {
  isOpen: boolean;
  open(opts?: { intent?: MentorIntent; question?: string }): void;
  close(): void;
  messages: ChatMessage[];
  pending: boolean;
  send(text: string, intent?: MentorIntent): void;
  retry(errorMessageId: string): void;
  /** The last question that failed, so the chat can put it back in the input box. */
  failedQuestion: string | null;
  context: MentorContext;
  /** True when the context comes from the learner's current topic rather than the screen they are on. */
  contextIsDefault: boolean;
  setContext(ctx: MentorContext | null): void;
  status: MentorStatusView | null;
}

const Ctx = createContext<MentorContextValue | null>(null);

export function MentorProvider({ children }: { children: ReactNode }) {
  const { state, actions } = useProgress();
  const learnerName = state.learner?.displayName;
  const grade = state.learner?.grade;
  const persona = getMentor(state.learner?.mentorId);
  const replyLanguage = state.settings.mentorLanguage;
  const [isOpen, setOpen] = useState(false);
  const [screenContext, setScreenContext] = useState<MentorContext | null>(null);
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});
  const [pending, setPending] = useState(false);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  const [status, setStatus] = useState<MentorStatusView | null>(null);
  const pendingRef = useRef(false);

  // Screens without their own context (Home, Settings...) use the learner's current topic.
  const defaultContext = useMemo<MentorContext>(() => {
    const next = nextActivity(state);
    return next ? { subjectId: next.subject.id, lessonId: next.lesson.id, topicId: next.topic.id, step: 'none' } : { step: 'none' };
  }, [state]);
  const contextValue = screenContext ?? defaultContext;

  // Only curriculum ids, the step, grade, language and chosen mentor go to the server: never the nickname.
  const mentorId = persona?.id;
  const context = useMemo<MentorContext>(
    () => ({ ...contextValue, grade: contextValue.grade ?? grade, replyLanguage, ...(mentorId ? { mentor: mentorId } : {}) }),
    [contextValue, grade, replyLanguage, mentorId],
  );
  const key = context.topicId ?? context.lessonId ?? context.subjectId ?? 'general';

  useEffect(() => {
    let alive = true;
    void fetchMentorStatus().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);

  const greeting = useMemo<ChatMessage>(() => {
    const title = getTopic(context.topicId)?.title ?? getLesson(context.lessonId)?.title ?? getSubject(context.subjectId)?.name;
    const hello = learnerName ? `Hi ${learnerName}!` : 'Hi there!';
    const me = persona ? ` It's ${persona.name}.` : '';
    return {
      id: `greeting-${key}`,
      role: 'mentor',
      text: `${hello}${me} ${title ? `Ask me anything about “${title}”.` : 'What would you like to learn about?'}`,
      localOnly: true,
    };
  }, [key, context.topicId, context.lessonId, context.subjectId, learnerName, persona]);

  const messages = useMemo(() => [greeting, ...(conversations[key] ?? [])], [greeting, conversations, key]);
  const append = useCallback((convKey: string, ...msgs: ChatMessage[]) => setConversations((all) => ({ ...all, [convKey]: [...(all[convKey] ?? []), ...msgs] })), []);

  const request = useCallback(
    async (history: ChatMessage[], intent: MentorIntent | undefined, convKey: string) => {
      pendingRef.current = true;
      setPending(true);
      // Progress questions carry a minimal summary computed from the app's real state.
      const progress = intent === 'progress' ? buildProgressSummary(state, context.subjectId) : undefined;
      const facts = progress ? progressFacts(progress, getSubject(context.subjectId)?.name) : undefined;
      const latest = history[history.length - 1];
      const payload: MentorRequest = {
        // Earlier progress answers stay on screen only: their numbers are sent once, with their own question.
        messages: toMentorMessages(history.filter((m) => m.intent !== 'progress' || m === latest)),
        context: progress ? { ...context, progress } : context,
        ...(intent ? { intent } : {}),
      };
      const result = await askMentor(payload, { liveBackend: status?.backend === true, mentorName: persona?.name });
      const lastLearner = [...history].reverse().find((m) => m.role === 'learner');
      const reply: ChatMessage = result.ok
        ? {
            id: createId('m'),
            role: 'mentor',
            text: result.reply.reply,
            source: result.source,
            provider: result.reply.provider,
            flagged: Boolean(result.reply.flagged),
            followUps: result.reply.followUps,
            facts,
            intent,
          }
        : { id: createId('m'), role: 'mentor', text: result.error.message, error: result.error, facts, intent };
      setFailedQuestion(result.ok ? null : (lastLearner?.text ?? null));
      append(convKey, reply);
      pendingRef.current = false;
      setPending(false);
    },
    [context, state, status, append, persona],
  );

  const send = useCallback(
    (raw: string, intent?: MentorIntent) => {
      const text = raw.replace(/\s+/g, ' ').trim().slice(0, MENTOR_LIMITS.maxLearnerChars);
      if (!text || pendingRef.current) return;
      setFailedQuestion(null);
      const local = intent ? (intent === 'progress' ? 'progress' : null) : detectLocalQuestion(text);
      actions.mentorQuestion();

      if (local === 'name') {
        // Answered on the device: the nickname never leaves the browser.
        append(
          key,
          { id: createId('m'), role: 'learner', text, localOnly: true },
          { id: createId('m'), role: 'mentor', text: nameReply(learnerName), source: 'app', localOnly: true },
        );
        return;
      }

      const effectiveIntent = local === 'progress' ? 'progress' : intent;
      const learnerMsg: ChatMessage = { id: createId('m'), role: 'learner', text, intent: effectiveIntent };
      append(key, learnerMsg);
      void request([...messages, learnerMsg], effectiveIntent, key);
    },
    [messages, key, actions, request, append, learnerName],
  );

  const retry = useCallback(
    (errorId: string) => {
      if (pendingRef.current) return;
      const conv = conversations[key] ?? [];
      const idx = conv.findIndex((m) => m.id === errorId);
      if (idx < 0) return;
      const trimmed = conv.slice(0, idx);
      const lastLearner = [...trimmed].reverse().find((m) => m.role === 'learner');
      if (!lastLearner) return;
      setFailedQuestion(null);
      setConversations((all) => ({ ...all, [key]: trimmed }));
      void request([greeting, ...trimmed], lastLearner.intent, key);
    },
    [conversations, key, request, greeting],
  );

  const open = useCallback(
    (opts?: { intent?: MentorIntent; question?: string }) => {
      setOpen(true);
      if (opts?.intent) {
        const label = suggestedPrompts().find((p) => p.intent === opts.intent)?.label ?? opts.question ?? 'Help me';
        send(opts.question ?? label, opts.intent);
      } else if (opts?.question) {
        send(opts.question);
      }
    },
    [send],
  );

  const setContext = useCallback((ctx: MentorContext | null) => setScreenContext(ctx), []);

  const value = useMemo<MentorContextValue>(
    () => ({
      isOpen,
      open,
      close: () => setOpen(false),
      messages,
      pending,
      send,
      retry,
      failedQuestion,
      context,
      contextIsDefault: screenContext === null,
      setContext,
      status,
    }),
    [isOpen, open, messages, pending, send, retry, failedQuestion, context, screenContext, setContext, status],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMentor(): MentorContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMentor must be used inside <MentorProvider>');
  return ctx;
}

/** Lets a screen describe what the learner is doing, so the mentor can answer in context. */
export function useMentorContext(ctx: MentorContext | null) {
  const { setContext } = useMentor();
  const serialized = JSON.stringify(ctx);
  useEffect(() => {
    setContext(serialized === 'null' ? null : (JSON.parse(serialized) as MentorContext));
  }, [serialized, setContext]);
  useEffect(() => () => setContext(null), [setContext]);
}
