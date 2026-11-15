import { ArrowLeft, CloudOff, RefreshCw, RotateCcw, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProblemCard } from '../../components/ui/ErrorFallbacks';
import { Skeleton } from '../../components/ui/primitives';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { reloadPage } from '../../lib/errors';

/** After this long, a topic that is still loading says so and offers a reload. */
export const SLOW_LOAD_MS = 10_000;

/**
 * The topic's content (video, game and quiz) could not be downloaded. Offline
 * learners are told so, and the download is tried again by itself when the
 * device comes back online. Saved progress and the current step are kept.
 */
export function TopicContentError({ retry, roadmapTo }: { retry: () => void; roadmapTo: string }) {
  const online = useOnlineStatus();
  const wasOffline = useRef(!online);

  // Coming back online retries straight away, so the learner does not have to.
  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) {
      wasOffline.current = false;
      retry();
    }
  }, [online, retry]);

  return (
    <ProblemCard
      icon={online ? <CloudOff className="h-8 w-8" aria-hidden="true" /> : <WifiOff className="h-8 w-8" aria-hidden="true" />}
      title={online ? "This topic didn't load" : "You're offline"}
      body={
        online
          ? 'Check your internet connection, then try again. Your progress is saved.'
          : "This topic needs the internet the first time it opens. We'll try again as soon as you're back online. Your progress is saved."
      }
    >
      <button type="button" onClick={retry} className="btn btn-primary">
        <RotateCcw className="h-5 w-5" aria-hidden="true" /> Try again
      </button>
      <Link to={roadmapTo} className="btn btn-secondary">
        <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back to the roadmap
      </Link>
    </ProblemCard>
  );
}

/** Loading placeholder for a topic; after SLOW_LOAD_MS it explains the wait and offers a reload. */
export function TopicContentLoading({ label }: { label: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div role="status" aria-live="polite">
      <p className="sr-only">Loading {label}…</p>
      {slow && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-reward-soft px-4 py-3">
          <p className="text-sm font-bold text-ink">This is taking longer than usual. A slow connection can do this.</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={reloadPage}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Reload
          </button>
        </div>
      )}
      <Skeleton className="h-6 w-56 max-w-full" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <Skeleton className="mt-4 aspect-video w-full rounded-3xl" />
      <Skeleton className="mt-4 h-24 w-full" />
    </div>
  );
}
