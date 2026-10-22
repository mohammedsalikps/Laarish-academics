import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { loadSubjectTopics } from '../../shared/curriculum/topicContent';
import type { SubjectId, Topic, TopicMeta } from '../../shared/curriculum/types';

/**
 * Full topic content in the browser. Roadmaps and progress use the topic index
 * that ships with the app; a subject's videos, games, quizzes and mentor notes
 * are downloaded the first time one of its topics (or the demo mentor) needs
 * them, then kept for the rest of the visit.
 */

type SubjectContent = { status: 'loading' } | { status: 'ready'; topics: Map<string, Topic> } | { status: 'error' };

const content = new Map<SubjectId, SubjectContent>();
const requests = new Map<SubjectId, Promise<Map<string, Topic>>>();
const listeners = new Set<() => void>();

function update(subjectId: SubjectId, entry: SubjectContent) {
  content.set(subjectId, entry);
  listeners.forEach((l) => l());
}

/** Loads a subject's topic content once; a failed download is tried again on the next call. */
export function loadTopicContent(subjectId: SubjectId): Promise<Map<string, Topic>> {
  const pending = requests.get(subjectId);
  if (pending) return pending;
  update(subjectId, { status: 'loading' });
  const request = loadSubjectTopics(subjectId).then(
    (topics) => {
      const byId = new Map(topics.map((t) => [t.id, t]));
      update(subjectId, { status: 'ready', topics: byId });
      return byId;
    },
    (err: unknown) => {
      requests.delete(subjectId);
      update(subjectId, { status: 'error' });
      throw err;
    },
  );
  requests.set(subjectId, request);
  return request;
}

/** Starts downloading a subject's topics in the background (for example from its lesson roadmap). */
export function preloadTopicContent(subjectId: SubjectId): void {
  loadTopicContent(subjectId).catch(() => {});
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type TopicContentState = { status: 'loading' } | { status: 'ready'; topic: Topic } | { status: 'error'; retry: () => void };

/** The full content of a topic, loading its subject's content if needed. */
export function useTopicContent(meta: TopicMeta | undefined): TopicContentState {
  const subjectId = meta?.subjectId;
  const entry = useSyncExternalStore(subscribe, () => (subjectId ? content.get(subjectId) : undefined));
  useEffect(() => {
    if (subjectId) preloadTopicContent(subjectId);
  }, [subjectId]);
  const retry = useCallback(() => {
    if (!subjectId) return;
    loadTopicContent(subjectId).catch(() => {
      // Some browsers (Chrome) remember a failed module download for the rest of the
      // visit, so only a fresh page load fetches it again. Progress and the step are kept.
      if (navigator.onLine) window.location.reload();
    });
  }, [subjectId]);

  if (entry?.status === 'error') return { status: 'error', retry };
  const topic = entry?.status === 'ready' && meta ? entry.topics.get(meta.id) : undefined;
  if (topic) return { status: 'ready', topic };
  return entry?.status === 'ready' ? { status: 'error', retry } : { status: 'loading' };
}
