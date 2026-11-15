import { useState } from 'react';
import { Dialog, DialogBody } from '../../components/ui/Dialog';
import type { SubjectId } from '../../domain/types';
import { cn } from '../../lib/cn';
import { updatePrefs, useAcademicsPrefs, weekKey } from '../../state/academicsPrefs';
import { WorldIcon } from '../../world3d/WorldChip';
import type { ClassWorld } from '../world/worldData';
import { dayKey, isValidTestDate } from './schoolWeek';

const SHORT: Partial<Record<string, string>> = {
  mathematics: 'Maths',
  'social-science': 'Social Science',
};

/**
 * "What is your class learning?" (wireframe H2): subject chips, the class's
 * chapters in NCERT order (coming-soon ones visible but not selectable), an
 * optional test date, and one gold Save. Nothing is saved on close.
 */
interface PickerProps {
  onClose: () => void;
  worlds: ClassWorld[];
  initialSubject?: SubjectId;
  /** Pre-select a chapter (e.g. the next one after "We moved on"). */
  preselect?: string;
  focusDate?: boolean;
}

export function ChapterPickerSheet({ open, ...props }: PickerProps & { open: boolean }) {
  // Mounted fresh on each open, so the draft starts from what is saved.
  return open ? <Picker {...props} /> : null;
}

function Picker({ onClose, worlds, initialSubject, preselect, focusDate = false }: PickerProps) {
  const prefs = useAcademicsPrefs();
  const start = initialSubject ?? (worlds[0]?.subject.id as SubjectId | undefined) ?? 'science';
  const [subject, setSubject] = useState<SubjectId>(start);
  const [chapters, setChapters] = useState(() => (preselect ? { ...prefs.schoolChapters, [start]: preselect } : prefs.schoolChapters));
  const [tests, setTests] = useState(prefs.testDates);
  const today = new Date();

  const world = worlds.find((w) => w.subject.id === subject);
  const chosen = chapters[subject];
  const test = tests[subject] ?? '';
  const max = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
  const testError = test && !isValidTestDate(test, today) ? 'Pick a school day (Monday to Saturday) in the next two weeks.' : '';

  const save = () => {
    const cleanTests = Object.fromEntries(Object.entries(tests).filter(([, d]) => d && isValidTestDate(d, today)));
    updatePrefs({
      schoolChapters: chapters,
      testDates: cleanTests,
      chaptersChangedBy: 'child',
      // The child has just told Rishi this week's chapters, so no Monday check-in today.
      checkInWeek: weekKey(today),
    });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="What is your class learning?" variant="sheet" initialFocusSelector={focusDate ? '#test-date' : undefined}>
      <DialogBody>
        <div role="tablist" aria-label="Subjects" className="no-scrollbar -mx-1 flex shrink-0 gap-2 overflow-x-auto px-1 py-1">
          {worlds.map((w) => {
            const selected = w.subject.id === subject;
            const notSet = !chapters[w.subject.id as SubjectId];
            return (
              <button
                key={w.subject.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSubject(w.subject.id as SubjectId)}
                className={cn(
                  'relative flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border-2 py-1 pl-1 pr-3.5 text-sm font-extrabold',
                  selected ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink',
                )}
              >
                <WorldIcon theme={w.theme} size={28} />
                {SHORT[w.subject.id] ?? w.subject.name}
                {notSet && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#E8833A]" aria-label="not set yet" />}
              </button>
            );
          })}
        </div>

        <fieldset className="mt-4">
          <legend className="sr-only">{world ? `${world.subject.name} chapters, Class ${world.grade}` : 'Chapters'}</legend>
          {world && world.chapters.length === 0 && <p className="rounded-2xl bg-canvas p-4 text-ink-soft">No chapters for this class yet.</p>}
          <ul className="divide-y divide-line">
            {world?.chapters.map((c) => {
              const soon = c.state === 'coming-soon';
              const selected = chosen === c.lesson.id;
              return (
                <li key={c.lesson.id}>
                  <label className={cn('flex min-h-[56px] items-center gap-3 py-2', soon ? 'cursor-not-allowed text-ink-muted' : 'cursor-pointer')}>
                    <input
                      type="radio"
                      name={`chapter-${subject}`}
                      value={c.lesson.id}
                      checked={selected}
                      disabled={soon}
                      onChange={() =>
                        setChapters((prev) => ({
                          ...prev,
                          [subject]: c.lesson.id,
                        }))
                      }
                      className={cn('h-6 w-6 shrink-0 accent-[rgb(15_116_121)]', soon && 'opacity-50')}
                      aria-label={`${c.lesson.title}${c.suggested ? ', suggested' : ''}${soon ? ', coming soon' : ''}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1.05rem] font-extrabold leading-tight">{c.lesson.title}</span>
                      {selected && <span className="block text-sm font-bold text-primary">We're on this</span>}
                    </span>
                    {c.suggested && !soon && <span className="chip shrink-0 bg-primary-soft text-primary-strong">Suggested</span>}
                    {soon && <span className="chip shrink-0 bg-canvas-sunken text-ink-muted">Coming soon</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        {chosen && (
          <div className="mt-3 rounded-2xl bg-canvas p-3">
            <label htmlFor="test-date" className="block text-sm font-extrabold text-ink">
              Test date (optional)
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="test-date"
                type="date"
                value={test}
                min={dayKey(today)}
                max={dayKey(max)}
                onChange={(e) => setTests((prev) => ({ ...prev, [subject]: e.target.value }))}
                className="min-h-[44px] flex-1 rounded-xl border-2 border-line bg-surface px-3 font-bold"
                aria-describedby="test-date-help"
              />
              {test && (
                <button type="button" onClick={() => setTests((prev) => ({ ...prev, [subject]: '' }))} className="btn btn-ghost btn-sm">
                  Remove
                </button>
              )}
            </div>
            <p id="test-date-help" className={cn('mt-1 text-sm', testError ? 'font-bold text-[#B8540F]' : 'text-ink-muted')}>
              {testError || 'With a test date, the card becomes a calm 3-day revision plan.'}
            </p>
          </div>
        )}

        <button type="button" onClick={save} className="btn btn-primary mt-4 w-full">
          Save
        </button>
        <p className="mt-2 text-center text-sm text-ink-muted">A grown-up can also set this in Grown-ups.</p>
      </DialogBody>
    </Dialog>
  );
}
