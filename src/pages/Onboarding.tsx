import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MENTORS, type MentorId } from '../../shared/mentor/personas';
import { BrandMark } from '../components/art/Brand';
import { MentorPicker } from '../components/mentor/MentorPicker';
import { GRADES, type Grade } from '../domain/types';
import { REWARD_RULES } from '../engine/rules';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn } from '../lib/cn';
import { DISPLAY_NAME_MAX, validateDisplayName } from '../lib/validation';
import { useProgress } from '../state/ProgressProvider';

const STEPS = ['Nickname', 'Class', 'Mentor'] as const;

/**
 * Profile setup in three short steps: a nickname, a class and a mentor
 * (Rishi or Ayra). Everything else has a sensible default and can be changed
 * later in Settings.
 */
export default function Onboarding() {
  useDocumentTitle('Create your explorer');
  const { state, actions } = useProgress();
  const navigate = useNavigate();
  const existing = state.learner;
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [mentor, setMentor] = useState<MentorId | null>(null);

  const titles = ['What should we call you?', `Hi ${name.trim() || 'explorer'}! Which class are you in?`, 'Choose your mentor'];

  const next = (e?: FormEvent) => {
    e?.preventDefault();
    if (step === 0) {
      const v = validateDisplayName(name);
      if (!v.ok) {
        setNameError(v.message);
        return;
      }
      setName(v.value);
      setNameError(null);
    }
    if (step === 1 && !grade) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (!mentor) return;
    actions.createLearner({ displayName: name, grade: grade!, avatarId: 'fox', mentorId: mentor, interests: [], dailyGoalXp: REWARD_RULES.dailyGoal.default });
    navigate('/home', { replace: true });
  };

  const canNext = step === 0 ? name.trim().length > 0 : step === 1 ? Boolean(grade) : Boolean(mentor);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-[var(--space-gutter)] py-4">
        <Link to="/" aria-label="Back to the welcome page">
          <BrandMark variant="compact" />
        </Link>
        <span className="chip bg-reward-soft text-xs text-reward-strong">Demo mode</span>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-[var(--space-gutter)] pb-8">
        <ol className="mb-6 flex gap-2" aria-label="Setup progress">
          {STEPS.map((t, i) => (
            <li key={t} className="flex-1" aria-current={i === step ? 'step' : undefined}>
              <span className={cn('block h-2 rounded-full transition', i <= step ? 'bg-primary' : 'bg-ink/10')} />
              <span className="sr-only">
                Step {i + 1}: {t}
                {i < step ? ', done' : ''}
              </span>
            </li>
          ))}
        </ol>

        {existing && (
          <p className="mb-5 rounded-2xl border border-reward/40 bg-reward-soft px-4 py-3 text-sm font-bold">
            {existing.displayName} is already learning on this device. A new explorer will replace {existing.displayName}'s demo progress.{' '}
            <Link to="/home" className="text-primary underline">
              Go back to {existing.displayName}
            </Link>
          </p>
        )}

        <form onSubmit={next} className="flex flex-1 flex-col" noValidate>
          <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-3xl">{titles[step]}</h1>

          <div className="mt-5 flex-1">
            {step === 0 && (
              <div>
                <label htmlFor="nickname" className="sr-only">
                  Nickname
                </label>
                <input
                  id="nickname"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  maxLength={DISPLAY_NAME_MAX + 5}
                  autoComplete="off"
                  autoFocus
                  aria-invalid={Boolean(nameError)}
                  aria-describedby="nickname-help"
                  className={cn(
                    'block w-full rounded-2xl border-2 bg-surface px-4 py-4 text-xl font-bold outline-none transition focus:border-primary',
                    nameError ? 'border-coral' : 'border-line',
                  )}
                  placeholder="A fun nickname"
                />
                <p id="nickname-help" className={cn('mt-2 text-sm', nameError ? 'font-bold text-coral-strong' : 'text-ink-muted')} role={nameError ? 'alert' : undefined}>
                  {nameError ?? 'A nickname is perfect. You do not need your full name.'}
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-4 gap-2 sm:gap-2.5" role="radiogroup" aria-label="Class">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={grade === g}
                    onClick={() => setGrade(g)}
                    className={cn(
                      'min-h-[72px] rounded-2xl border-2 px-2 text-center transition',
                      grade === g ? 'border-primary bg-primary-soft shadow-soft' : 'border-line bg-surface hover:border-primary/40',
                    )}
                  >
                    <span className="block font-display text-lg font-semibold sm:text-xl">Class {g}</span>
                    <span className="block text-xs font-bold text-ink-muted">
                      Age {g + 5}-{g + 6}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="-mt-2 mb-4 text-ink-soft">Your mentor helps you in every lesson. You can change this later.</p>
                <MentorPicker value={mentor} onChange={setMentor} />
                <p className="mt-5 text-xs leading-relaxed text-ink-muted">
                  For grown-ups: this is a demo. Progress stays in this browser. Questions typed to the mentor are sent to the Laarish server without the nickname and are not
                  saved.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back
              </button>
            ) : (
              <span />
            )}
            <button type="submit" className="btn btn-primary btn-lg" disabled={!canNext}>
              {step === STEPS.length - 1 ? (mentor ? `Start with ${MENTORS[mentor].name}` : 'Choose a mentor') : 'Next'}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
