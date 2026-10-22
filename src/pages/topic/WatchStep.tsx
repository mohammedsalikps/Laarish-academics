import { ChevronDown, Clapperboard, Info } from 'lucide-react';
import { useCallback, useState } from 'react';
import { getVideoSpec, narrationCues } from '../../../shared/media/videoSpecs';
import { ExplainerPlayer } from '../../components/lesson/ExplainerPlayer';
import { VideoPlayer } from '../../components/lesson/VideoPlayer';
import { MentorBubble } from '../../components/mentor/MentorBubble';
import { Skeleton } from '../../components/ui/primitives';
import { useVideo } from '../../content/media';
import { REWARD_RULES } from '../../engine/rules';
import { useMentorPersona } from '../../mentor/useMentorPersona';
import { useProgress } from '../../state/ProgressProvider';
import { StepFooter, type StepViewProps } from './shared';

/**
 * Step 1: watch the lesson video (or the clearly labelled temporary explainer).
 * The step counts as done when the learner reaches the end, not when the page opens.
 */
export function WatchStep({ topic, completed, practice, onNext, onBack }: StepViewProps) {
  const { actions } = useProgress();
  const persona = useMentorPersona();
  const resolved = useVideo(topic.watch.video);
  const [fallback, setFallback] = useState(false);
  const [watched, setWatched] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const onProgress = useCallback((f: number) => setWatched((w) => Math.max(w, f)), []);
  const usingVideo = resolved.state === 'available' && !fallback;
  const watchedEnough = watched >= REWARD_RULES.video.watchedThreshold;
  // First time through, the learner must reach the end; replays and finished topics can move on freely.
  const canContinue = watchedEnough || completed || practice;

  // Production spec of the official video: timed narration for captions, read-aloud and the transcript.
  const spec = getVideoSpec(topic.watch.video.id);
  const cues = usingVideo && spec ? narrationCues(spec) : undefined;
  const transcript = cues ? cues.map((c) => c.text) : topic.watch.explainer.map((s) => s.caption);

  const finish = () => {
    if (!canContinue) return;
    actions.completeWatch(topic.id, watchedEnough);
    onNext();
  };

  return (
    <div>
      <MentorBubble text={topic.watch.intro} className="mb-3" />

      {/* On short desktop screens the player narrows so its controls and the footer stay on screen; phones use the full width. */}
      <div className="mx-auto w-full max-w-[max(30rem,calc((100dvh-29rem)*16/9))]">
        {resolved.state === 'loading' ? (
          <Skeleton className="aspect-video w-full" />
        ) : usingVideo ? (
          <VideoPlayer asset={resolved.asset} cues={cues} onProgress={onProgress} onFallback={() => setFallback(true)} />
        ) : (
          <ExplainerPlayer scenes={topic.watch.explainer} onProgress={onProgress} />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {usingVideo ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
            <Clapperboard className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            Laarish lesson video{cues ? ' · captions and read-aloud narration' : ''}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
            <Info className="h-3.5 w-3.5 shrink-0 text-reward-strong" aria-hidden="true" />
            {fallback
              ? 'The video could not be played, so you are watching the temporary animated explainer instead.'
              : 'Temporary animated explainer. The official video for this topic has not been added yet.'}
          </p>
        )}
        <button
          type="button"
          className="inline-flex min-h-[40px] items-center gap-1 rounded-xl px-2 text-sm font-extrabold text-primary hover:bg-primary-soft"
          aria-expanded={showMore}
          onClick={() => setShowMore((s) => !s)}
        >
          <ChevronDown className={`h-4 w-4 transition ${showMore ? 'rotate-180' : ''}`} aria-hidden="true" />
          {showMore ? 'Hide key ideas' : 'Key ideas and transcript'}
        </button>
      </div>

      {showMore && (
        <div className="mt-2 grid gap-3 rounded-3xl bg-surface p-4 shadow-soft sm:grid-cols-2">
          <div>
            <h3 className="font-display text-base font-semibold">The big idea</h3>
            <ul className="mt-2 space-y-1.5">
              {topic.watch.keyIdeas.map((idea) => (
                <li key={idea} className="flex gap-2 text-[0.95rem] leading-snug">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {idea}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-base font-semibold">Transcript</h3>
            <ol className="mt-2 space-y-1.5 text-[0.95rem]">
              {transcript.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-extrabold text-ink-muted">{i + 1}.</span>
                  {line}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <StepFooter
        onBack={onBack}
        onContinue={finish}
        canContinue={canContinue}
        continueLabel="Continue to Play"
        hint={canContinue ? undefined : `${persona.name}: watch to the end, then we'll play!`}
      />
    </div>
  );
}
