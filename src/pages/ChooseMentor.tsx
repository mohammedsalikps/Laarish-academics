import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MENTORS, type MentorId } from '../../shared/mentor/personas';
import { BrandMark } from '../components/art/Brand';
import { MentorPicker } from '../components/mentor/MentorPicker';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useProgress } from '../state/ProgressProvider';

/** One-time choice for profiles made before mentors existed. Progress is kept. */
export default function ChooseMentor() {
  useDocumentTitle('Choose your mentor');
  const { state, actions } = useProgress();
  const navigate = useNavigate();
  const location = useLocation();
  const [mentor, setMentor] = useState<MentorId | null>(null);
  const from = (location.state as { from?: string } | null)?.from ?? '/home';

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto w-full max-w-2xl px-[var(--space-gutter)] py-4">
        <BrandMark variant="compact" />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-[var(--space-gutter)] pb-8">
        <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-3xl">Choose your mentor, {state.learner?.displayName}</h1>
        <p className="mb-5 mt-1 text-ink-soft">Your mentor helps you in every lesson. Your progress stays the same.</p>
        <MentorPicker value={mentor} onChange={setMentor} />
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={!mentor}
            onClick={() => {
              if (!mentor) return;
              actions.updateLearner({ mentorId: mentor });
              navigate(from, { replace: true });
            }}
          >
            {mentor ? `Continue with ${MENTORS[mentor].name}` : 'Choose a mentor'} <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </main>
    </div>
  );
}
