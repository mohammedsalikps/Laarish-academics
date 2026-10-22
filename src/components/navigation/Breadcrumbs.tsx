import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

export interface Crumb {
  label: string;
  to?: string;
}

/**
 * Where-am-I trail. On phones only the parent is shown as a back link to save
 * space; from small tablets up, the full trail is shown.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  // Closest ancestor with a link (the current page is the last item).
  const parent = items
    .slice(0, -1)
    .reverse()
    .find((c) => c.to);
  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm font-bold', className)}>
      {parent?.to && (
        <Link to={parent.to} className="inline-flex min-h-[40px] items-center gap-1 text-ink-soft hover:text-ink sm:hidden">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {parent.label}
        </Link>
      )}
      <ol className="hidden flex-wrap items-center gap-1 text-ink-muted sm:flex">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {c.to && !last ? (
                <Link to={c.to} className="rounded-lg px-1 py-0.5 text-ink-soft hover:bg-ink/5 hover:text-ink">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={cn('px-1', last && 'text-ink')}>
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Consistent page header: breadcrumbs, eyebrow, title, description and actions. */
export function PageHeader({
  crumbs,
  eyebrow,
  eyebrowColor,
  title,
  description,
  actions,
  aside,
  children,
}: {
  crumbs?: Crumb[];
  eyebrow?: string;
  eyebrowColor?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 md:mb-8">
      {crumbs && <Breadcrumbs items={crumbs} className="mb-3" />}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && (
            <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: eyebrowColor ?? 'rgb(var(--c-ink-muted))' }}>
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1 text-3xl font-semibold leading-tight md:text-4xl">{title}</h1>
          {description && <p className="mt-2 text-[1.02rem] text-ink-soft">{description}</p>}
          {children}
        </div>
        {(actions || aside) && (
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {aside}
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
