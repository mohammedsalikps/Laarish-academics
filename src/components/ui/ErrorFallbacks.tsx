import { House, RefreshCw, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { MentorAvatar } from '../mentor/MentorAvatar';
import { reloadPage } from '../../lib/errors';
import type { ErrorFallbackProps } from './ErrorBoundary';

/** A calm "something went wrong" card with clear ways forward. */
export function ProblemCard({
  icon,
  title,
  body,
  children,
  headingLevel = 2,
  className,
}: {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  children?: ReactNode;
  headingLevel?: 1 | 2;
  className?: string;
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className={cn('card mx-auto max-w-md p-6 text-center', className)} role="alert">
      <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary">{icon}</div>
      <Heading className="text-xl font-semibold md:text-2xl">{title}</Heading>
      <p className="mt-1.5 text-ink-soft">{body}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

/** "Try again" for a crash, or "Reload page" when the app's own code failed to download. */
export function RetryButton({ reset, chunkError, label = 'Try again' }: Pick<ErrorFallbackProps, 'reset' | 'chunkError'> & { label?: string }) {
  return chunkError ? (
    <button type="button" className="btn btn-primary" onClick={reloadPage}>
      <RefreshCw className="h-5 w-5" aria-hidden="true" /> Reload page
    </button>
  ) : (
    <button type="button" className="btn btn-primary" onClick={reset}>
      <RotateCcw className="h-5 w-5" aria-hidden="true" /> {label}
    </button>
  );
}

export const SAVED_NOTE = 'Your progress is saved.';

/** A screen inside the app could not be shown. Navigation stays usable around it. */
export function ScreenErrorFallback({ reset, chunkError }: ErrorFallbackProps) {
  return (
    <div className="grid min-h-[60dvh] place-items-center p-6">
      <ProblemCard
        headingLevel={1}
        icon={<MentorAvatar size={56} mood="thinking" />}
        title="This page hit a snag"
        body={
          chunkError
            ? `Part of the app didn't download. Check your internet connection, then reload. ${SAVED_NOTE}`
            : `Something went wrong while showing this page. ${SAVED_NOTE} Let's try again.`
        }
      >
        <RetryButton reset={reset} chunkError={chunkError} />
        <Link to="/home" className="btn btn-secondary">
          <House className="h-5 w-5" aria-hidden="true" /> Go home
        </Link>
      </ProblemCard>
    </div>
  );
}

/**
 * Last line of defence, outside the router and saved-progress providers, so it
 * uses nothing but plain markup and the global styles.
 */
export function AppCrashScreen() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-6">
      <div className="card max-w-md p-8 text-center" role="alert">
        <h1 className="text-2xl font-semibold">Laarish Academics needs a restart</h1>
        <p className="mt-2 text-ink-soft">Something went wrong. Progress saved on this device is kept. Reload to carry on learning.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn btn-primary" onClick={reloadPage}>
            <RefreshCw className="h-5 w-5" aria-hidden="true" /> Reload
          </button>
          <a href="/home" className="btn btn-secondary">
            <House className="h-5 w-5" aria-hidden="true" /> Go home
          </a>
        </div>
      </div>
    </main>
  );
}
