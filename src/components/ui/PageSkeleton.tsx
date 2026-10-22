import { BrandWordmark } from '../art/Brand';
import { Skeleton } from './primitives';

/** Loading placeholder shown while a lazily loaded screen downloads. */
export function PageSkeleton() {
  return (
    <div className="page" role="status" aria-label="Loading">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-5 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-44 md:col-span-2" />
        <Skeleton className="h-44" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  );
}

/** Full-screen splash while saved progress is loading. */
export function SplashScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas" role="status" aria-label="Loading Laarish Academics">
      <div className="flex flex-col items-center gap-4">
        <span className="animate-pulse motion-reduce:animate-none">
          <BrandWordmark height={56} />
        </span>
        <p className="font-display text-lg font-semibold text-ink-soft">Loading your adventure...</p>
      </div>
    </div>
  );
}
