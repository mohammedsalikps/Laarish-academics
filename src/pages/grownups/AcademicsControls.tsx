import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SubjectId } from '../../domain/types';
import { REWARD_RULES } from '../../engine/rules';
import { cn } from '../../lib/cn';
import { updatePrefs, useAcademicsPrefs, type LiteModeSetting } from '../../state/academicsPrefs';
import { useProgress } from '../../state/ProgressProvider';
import { WorldIcon } from '../../world3d/WorldChip';
import { ChapterPickerSheet } from '../home/ChapterPickerSheet';
import { parseDay } from '../home/schoolWeek';
import { allClassWorlds } from '../world/worldData';

const LITE: { value: LiteModeSetting; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'on', label: 'Always on' },
  { value: 'off', label: 'Off' },
];

/**
 * Academics controls for grown-ups (wireframe G2 + G3): school chapters and
 * test dates per subject, and Lite mode. Shown only behind the parental gate.
 */
export function AcademicsControls() {
  const { state, actions } = useProgress();
  const prefs = useAcademicsPrefs();
  const worlds = allClassWorlds(state, prefs);
  const [editing, setEditing] = useState<SubjectId | null>(null);

  return (
    <section className="card mt-5 p-5 font-grown" aria-labelledby="academics-controls">
      <span className="inline-block rounded-full bg-grownup-soft px-3 py-1 text-xs font-extrabold text-grownup">For grown-ups</span>
      <h2 id="academics-controls" className="mt-2 text-lg font-extrabold text-ink">
        School chapters and tests
      </h2>
      <p className="text-sm text-ink-muted">What {state.learner?.displayName}'s class is on this week. Home plans the week from this.</p>
      {prefs.chaptersChangedBy === 'child' && Object.keys(prefs.schoolChapters).length > 0 && (
        <p className="mt-2 text-sm font-bold text-ink-soft">Last changed by {state.learner?.displayName}. You can keep or change it.</p>
      )}
      <ul className="mt-3 divide-y divide-line">
        {worlds.map((w) => {
          const test = prefs.testDates[w.subject.id as SubjectId];
          const testDay = test ? parseDay(test) : null;
          return (
            <li key={w.subject.id}>
              <button
                type="button"
                onClick={() => setEditing(w.subject.id as SubjectId)}
                className={cn('flex min-h-[56px] w-full items-center gap-3 py-2 text-left', !w.thisWeek && 'rounded-2xl border-2 border-dashed border-grownup/40 px-2')}
              >
                <WorldIcon theme={w.theme} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-ink-muted">
                    {w.theme.name} · {w.subject.name}
                  </span>
                  <span className={cn('block font-extrabold', w.thisWeek ? 'text-ink' : 'text-grownup')}>{w.thisWeek ? w.thisWeek.lesson.title : 'Not set yet'}</span>
                </span>
                <span className="shrink-0 rounded-full bg-canvas-sunken px-2.5 py-1 text-xs font-bold text-ink-soft">
                  {testDay ? `Test · ${testDay.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}` : 'Add a test date'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-muted">Syllabus: NCERT (CBSE). Karnataka State Board is in development and cannot be selected yet.</p>

      <h2 className="mt-6 text-lg font-extrabold text-ink" id="daily-goal-title">
        Daily goal
      </h2>
      <div role="radiogroup" aria-labelledby="daily-goal-title" className="mt-2 grid grid-cols-3 gap-2">
        {REWARD_RULES.dailyGoal.options.map((g) => {
          const selected = state.learner?.dailyGoalXp === g;
          return (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => actions.updateLearner({ dailyGoalXp: g })}
              className={cn('min-h-[48px] rounded-2xl border-2 font-extrabold', selected ? 'border-grownup bg-grownup-soft text-grownup' : 'border-line bg-surface text-ink')}
            >
              {g} XP
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-sm text-ink-muted">XP is earned by learning (a step is 10 XP, a finished topic 30). The same goal is in Settings and drives the weekly report.</p>

      <h2 className="mt-6 text-lg font-extrabold text-ink" id="lite-mode-title">
        Lite mode (2D map and lists)
      </h2>
      <div role="radiogroup" aria-labelledby="lite-mode-title" className="mt-2 grid grid-cols-3 gap-2">
        {LITE.map((o) => {
          const selected = prefs.liteMode === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => updatePrefs({ liteMode: o.value })}
              className={cn('min-h-[48px] rounded-2xl border-2 font-extrabold', selected ? 'border-grownup bg-grownup-soft text-grownup' : 'border-line bg-surface text-ink')}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-sm text-ink-muted">Auto turns Lite mode on for low-end phones and when reduced motion is set. Takes effect on the next screen; the child sees no prompt.</p>
      <p className="mt-4 text-sm text-ink-soft">
        Read aloud, voice answers and motion are in{' '}
        <Link to="/settings" className="font-extrabold text-grownup underline">
          Settings
        </Link>
        .
      </p>
      <ChapterPickerSheet open={editing !== null} onClose={() => setEditing(null)} worlds={worlds} initialSubject={editing ?? undefined} changedBy="grown-up" />
    </section>
  );
}
