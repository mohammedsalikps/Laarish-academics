import { Check } from 'lucide-react';
import { MENTOR_IDS, MENTORS, type MentorId } from '../../../shared/mentor/personas';
import { cn } from '../../lib/cn';
import { MentorAvatar } from './MentorAvatar';

/** The two mentor characters, side by side. Used in setup and in Settings. */
export function MentorPicker({ value, onChange, size = 'large' }: { value: MentorId | null; onChange: (id: MentorId) => void; size?: 'large' | 'compact' }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4" role="radiogroup" aria-label="Choose your mentor">
      {MENTOR_IDS.map((id) => {
        const m = MENTORS[id];
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(id)}
            className={cn(
              'group relative flex flex-col items-center rounded-4xl border-2 px-2 pb-4 text-center transition sm:px-4',
              size === 'large' ? 'pt-3' : 'pt-2',
              selected ? 'border-primary bg-primary-soft shadow-soft' : 'border-line bg-surface hover:border-primary/40',
            )}
          >
            <span className="grid w-full place-items-center rounded-3xl" style={{ backgroundColor: m.colors.soft }}>
              <MentorAvatar mentorId={id} variant="full" size={size === 'large' ? 176 : 104} className="transition group-hover:-translate-y-0.5" />
            </span>
            <span className="mt-3 font-display text-2xl font-semibold leading-none">{m.name}</span>
            <span className="mt-1.5 text-sm font-semibold leading-snug text-ink-soft">“{m.intro}”</span>
            {selected && (
              <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-primary text-white shadow-soft">
                <Check className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Selected</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
