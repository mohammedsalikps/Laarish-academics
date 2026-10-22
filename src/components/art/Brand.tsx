import { cn } from '../../lib/cn';

/**
 * Laarish brand assets, generated from the official brand-kit logo
 * (public/brand: transparent wordmark and the ruler "L" app icon).
 */
const WORDMARK_RATIO = 539 / 160;

/** The ruler "L" app icon on its cream tile. */
export function BrandIcon({ size = 36, className }: { size?: number; className?: string }) {
  return <img src="/brand/icon-192.png" width={size} height={size} alt="" aria-hidden="true" className={cn('shrink-0 rounded-[28%]', className)} />;
}

/** The colourful "Laarish" wordmark. */
export function BrandWordmark({ height = 32, className }: { height?: number; className?: string }) {
  return (
    <picture className="shrink-0">
      <source srcSet="/brand/laarish-logo.webp" type="image/webp" />
      <img src="/brand/laarish-logo.png" width={Math.round(height * WORDMARK_RATIO)} height={height} alt="Laarish" className={cn('block', className)} />
    </picture>
  );
}

/**
 * Brand mark: "Laarish Academics".
 * - full: wordmark with "Academics" underneath
 * - compact: wordmark only (Academics is read by screen readers)
 * - icon: the app icon, for very narrow spaces
 */
export function BrandMark({ variant = 'full', className }: { variant?: 'full' | 'compact' | 'icon'; className?: string }) {
  if (variant === 'icon') {
    return (
      <span className={cn('inline-flex', className)}>
        <BrandIcon size={44} />
        <span className="sr-only">Laarish Academics</span>
      </span>
    );
  }
  return (
    <span className={cn('inline-flex flex-col items-start leading-none', className)}>
      <BrandWordmark height={variant === 'compact' ? 28 : 34} />
      {variant === 'full' ? (
        <span className="pl-0.5 pt-1 text-[0.66rem] font-extrabold uppercase tracking-[0.32em] text-ink-muted">Academics</span>
      ) : (
        <span className="sr-only">Academics</span>
      )}
    </span>
  );
}
