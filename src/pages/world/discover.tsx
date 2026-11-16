import {
  BookOpen,
  Blocks,
  Calculator,
  Check,
  Citrus,
  Flower2,
  Globe,
  Lighthouse,
  Magnet,
  Pencil,
  Shapes,
  Signpost,
  Sparkles,
  Sprout,
  Telescope,
  Volume2,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useCallback } from 'react';
import { Dialog, DialogBody } from '../../components/ui/Dialog';
import { useSpeech } from '../../hooks/usePreferences';
import { cn } from '../../lib/cn';
import type { Discovery, DiscoveryIcon } from '../../world3d/discoveries';

const ICONS: Record<DiscoveryIcon, LucideIcon> = {
  telescope: Telescope,
  magnet: Magnet,
  sprout: Sprout,
  blocks: Blocks,
  calculator: Calculator,
  shapes: Shapes,
  book: BookOpen,
  pencil: Pencil,
  citrus: Citrus,
  wind: Wind,
  flower: Flower2,
  waves: Waves,
  globe: Globe,
  lighthouse: Lighthouse,
  signpost: Signpost,
};

/** The picture on a marker: the letter for letter stones and blocks, otherwise the object's icon. */
function DiscoveryArt({ discovery, size }: { discovery: Discovery; size: number }) {
  if (discovery.glyph) {
    return (
      <span className="font-display font-extrabold leading-none" style={{ fontSize: discovery.glyph.length > 1 ? size * 0.34 : size * 0.52 }} aria-hidden="true">
        {discovery.glyph}
      </span>
    );
  }
  const Art = ICONS[discovery.icon];
  return <Art style={{ width: size * 0.5, height: size * 0.5 }} aria-hidden="true" />;
}

/**
 * A small round marker over a discovery object in the 3D world (44 px). Not yet found:
 * a gold sparkle invites a tap; found: a green tick.
 */
export function DiscoveryMarker({ discovery, found, onOpen }: { discovery: Discovery; found: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={found ? `${discovery.name}, discovered. Read it again` : `Discover: ${discovery.name}`}
      className="group relative grid h-11 w-11 place-items-center rounded-full focus-visible:outline-none"
    >
      <span
        className={cn(
          'grid h-10 w-10 place-items-center rounded-full border-2 shadow-lift transition group-hover:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-primary',
          found ? 'border-white bg-white/90 text-ink-soft' : 'border-white bg-reward text-ink',
        )}
      >
        <DiscoveryArt discovery={discovery} size={40} />
      </span>
      <span
        className={cn('absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-white', found ? 'bg-success text-white' : 'bg-white text-reward-strong')}
        aria-hidden="true"
      >
        {found ? <Check className="h-3 w-3" strokeWidth={3} /> : <Sparkles className="h-3 w-3" />}
      </span>
    </button>
  );
}

/** The fact card for one discovery, with Read aloud. */
export function DiscoveryDialog({
  discovery,
  worldName,
  foundCount,
  total,
  onClose,
}: {
  discovery: Discovery | null;
  worldName: string;
  foundCount: number;
  total: number;
  onClose: () => void;
}) {
  const speech = useSpeech();
  const { stop } = speech;
  const close = useCallback(() => {
    stop();
    onClose();
  }, [stop, onClose]);
  return (
    <Dialog open={discovery !== null} onClose={close} title={discovery?.name ?? 'Discovery'} variant="sheet" titleAdornment={<Sparkles className="h-6 w-6 text-reward-strong" aria-hidden="true" />}>
      {discovery && (
        <DialogBody>
          <div className="flex items-start gap-4">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-reward-soft text-ink">
              <DiscoveryArt discovery={discovery} size={72} />
            </span>
            <p className="text-lg font-bold leading-relaxed text-ink">{discovery.fact}</p>
          </div>
          <p className="mt-4 text-sm font-extrabold text-ink-muted">
            You have found {foundCount} of {total} things to discover in {worldName}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {speech.canSpeak(discovery.fact) && (
              <button
                type="button"
                onClick={() => (speech.speaking ? speech.stop() : speech.speak(discovery.fact))}
                className="btn btn-secondary min-h-[48px]"
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" /> {speech.speaking ? 'Stop reading' : 'Read aloud'}
              </button>
            )}
            <button type="button" onClick={close} className="btn btn-primary min-h-[48px]">
              Got it
            </button>
          </div>
        </DialogBody>
      )}
    </Dialog>
  );
}

/** List view and Lite mode: the same discoveries as buttons. */
export function DiscoveryList({ items, isFound, onOpen }: { items: readonly Discovery[]; isFound: (d: Discovery) => boolean; onOpen: (d: Discovery) => void }) {
  if (items.length === 0) return null;
  const count = items.filter(isFound).length;
  return (
    <section className="mx-auto mt-6 max-w-xl" aria-labelledby="discover-heading">
      <div className="flex items-center gap-2">
        <h2 id="discover-heading" className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
          <Sparkles className="h-5 w-5 text-reward-strong" aria-hidden="true" /> Things to discover
        </h2>
        <span className="ml-auto text-sm font-extrabold text-ink-muted">
          {count} of {items.length} found
        </span>
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {items.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => onOpen(d)}
              className="card flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left transition hover:shadow-lift"
              aria-label={isFound(d) ? `${d.name}, discovered. Read it again` : `Discover: ${d.name}`}
            >
              <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', isFound(d) ? 'bg-success-soft text-success-strong' : 'bg-reward-soft text-ink')}>
                <DiscoveryArt discovery={d} size={40} />
              </span>
              <span className="min-w-0 flex-1 truncate font-extrabold text-ink">{d.name}</span>
              {isFound(d) && <Check className="h-5 w-5 shrink-0 text-success-strong" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
