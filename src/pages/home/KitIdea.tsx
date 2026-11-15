import { Box, X } from 'lucide-react';
import { useState } from 'react';
import { GrownUpGate } from '../../components/ui/GrownUpGate';
import { dayKey } from './schoolWeek';

const DISMISS_KEY = 'laarish-academics:kit-idea-dismissed';

/** Kits that match a chapter (Laarish experiential kits). Calm, one line, no price, no countdown (rule 5). */
const KITS: Record<string, { kit: string; idea: string; guide: string }> = {
  magnets: {
    kit: "I'm An Electrical Engineer",
    idea: 'Build a magnet motor with it.',
    guide: "Look for the magnet motor build in the kit's guide in the Vision Discovery app, and build it together with your child.",
  },
};

function dismissedToday(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === dayKey(new Date());
  } catch {
    return false;
  }
}

/** Kit suggestion (wireframe H1 note 5): only for a chapter with a matching kit, dismissable, at most once a day. */
export function KitIdea({ lessonId }: { lessonId: string | undefined }) {
  const [hidden, setHidden] = useState(dismissedToday);
  const [gate, setGate] = useState(false);
  const kit = lessonId ? KITS[lessonId] : undefined;
  if (!kit || hidden) return null;
  return (
    <section aria-label="Kit idea" className="card flex items-center gap-3 p-3 pr-2">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-canvas-sunken text-ink" aria-hidden="true">
        <Box className="h-6 w-6" />
      </span>
      <p className="min-w-0 flex-1 text-[0.95rem] font-bold leading-snug text-ink">
        Have the {kit.kit} kit? {kit.idea}
      </p>
      <button type="button" onClick={() => setGate(true)} className="btn btn-secondary btn-sm shrink-0">
        See how
      </button>
      <button
        type="button"
        onClick={() => {
          try {
            window.localStorage.setItem(DISMISS_KEY, dayKey(new Date()));
          } catch {
            // Hide for this visit only.
          }
          setHidden(true);
        }}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-ink/5"
        aria-label="Hide the kit idea for today"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <GrownUpGate open={gate} onClose={() => setGate(false)} title={`${kit.kit} kit`}>
        <p className="text-ink-soft">{kit.guide}</p>
        <p className="mt-3 rounded-xl bg-grownup-soft p-3 text-sm font-semibold text-ink">
          Laarish Academics never sells inside the child's app. Kits are optional; every lesson works without one.
        </p>
        <button type="button" onClick={() => setGate(false)} className="btn btn-grownup mt-4 w-full">
          Done
        </button>
      </GrownUpGate>
    </section>
  );
}
