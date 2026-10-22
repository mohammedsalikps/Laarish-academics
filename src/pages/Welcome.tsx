import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandMark } from '../components/art/Brand';
import { MentorAvatar } from '../components/mentor/MentorAvatar';
import { Dialog } from '../components/ui/Dialog';
import { SAMPLE_CURRICULUM_NOTICE } from '../content';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useProgress } from '../state/ProgressProvider';

/**
 * Entry screen: the brand, the two mentors, one short promise and one main
 * action. Everything else (subjects, rewards, features) waits until after
 * the child has started.
 */
export default function Welcome() {
  useDocumentTitle('Welcome');
  const { state, ready } = useProgress();
  const navigate = useNavigate();
  const learner = ready ? state.learner : null;
  const [signInOpen, setSignInOpen] = useState(false);
  const [parentsOpen, setParentsOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-canvas">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-[var(--space-gutter)] py-4">
        <BrandMark />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setParentsOpen(true)}>
          For grown-ups
        </button>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-[var(--space-gutter)] pb-10 text-center">
        <div className="flex items-end justify-center" aria-hidden="true">
          <MentorAvatar mentorId="rishi" variant="full" size={240} className="-mr-3 h-[180px] w-auto animate-fade-up sm:h-[240px]" />
          <MentorAvatar mentorId="ayra" variant="full" size={240} className="-ml-3 h-[180px] w-auto animate-fade-up [animation-delay:120ms] sm:h-[240px]" />
        </div>
        <h1 className="mt-5 text-[2.1rem] font-semibold leading-[1.1] tracking-tight sm:text-5xl">Learn by doing, with Rishi and Ayra</h1>
        <p className="mt-3 text-lg text-ink-soft">Short videos, games and experiments for Classes 1 to 8.</p>

        <div className="mt-7 flex w-full flex-col items-center gap-2">
          {learner ? (
            <>
              <Link to="/home" className="btn btn-primary btn-lg w-full sm:w-auto sm:min-w-[260px]">
                Continue learning <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <p className="text-sm font-bold text-ink-muted">
                as {learner.displayName} ·{' '}
                <Link to="/start" className="text-primary hover:underline">
                  new explorer
                </Link>
              </p>
            </>
          ) : (
            <>
              <Link to="/start" className="btn btn-primary btn-lg w-full sm:w-auto sm:min-w-[260px]">
                Start learning <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSignInOpen(true)}>
                I already have a profile
              </button>
            </>
          )}
        </div>
      </main>

      <footer className="px-[var(--space-gutter)] pb-5 text-center text-xs text-ink-muted">Demo version: progress is saved in this browser only. {SAMPLE_CURRICULUM_NOTICE}</footer>

      <Dialog open={signInOpen} onClose={() => setSignInOpen(false)} title="Sign in" description="Accounts are coming soon.">
        <div className="space-y-4 px-5 pb-6 pt-3 sm:px-6">
          <p className="text-ink-soft">
            Secure accounts, with a grown-up's permission, are not switched on in this demo. Profiles are kept in this browser on this device only, so a profile made on another
            device or browser is not available here.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-ghost" onClick={() => setSignInOpen(false)}>
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSignInOpen(false);
                navigate(learner ? '/home' : '/start');
              }}
            >
              {learner ? 'Continue in demo mode' : 'Start in demo mode'}
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog open={parentsOpen} onClose={() => setParentsOpen(false)} title="For parents and guardians">
        <div className="space-y-3 px-5 pb-6 pt-3 text-[0.98rem] text-ink-soft sm:px-6">
          <p>Laarish Academics helps children learn through short videos, interactive games and experiments, quizzes, and a mentor character (Rishi or Ayra) who gives hints and explanations.</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>This demo asks only for a nickname, a grade and a mentor. No email, birthday or photo is collected.</li>
            <li>Progress is stored in this browser only. Nothing is shared with other learners, and there are no ads or purchases.</li>
            <li>Questions typed to the mentor are sent to the Laarish server, without the child's nickname, so an AI answer can be generated. Conversations are not saved.</li>
            <li>The sample lessons are demonstration content and are not aligned to an official syllabus.</li>
          </ul>
          <p>After your child starts, you can open the grown-ups' progress summary from Settings.</p>
        </div>
      </Dialog>
    </div>
  );
}
