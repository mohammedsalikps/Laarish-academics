import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: traps focus, closes on Escape or backdrop click, restores
 * focus on close and locks page scroll. `variant="sheet"` renders a right-side
 * drawer on tablets/desktops and a bottom sheet on phones.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  variant = 'center',
  hideTitle = false,
  className,
  initialFocusSelector,
  titleAdornment,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  variant?: 'center' | 'sheet';
  hideTitle?: boolean;
  className?: string;
  initialFocusSelector?: string;
  /** Shown before the title, e.g. the mentor's face. */
  titleAdornment?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    const initial = (initialFocusSelector && panel?.querySelector<HTMLElement>(initialFocusSelector)) || panel?.querySelector<HTMLElement>(FOCUSABLE);
    (initial ?? panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, initialFocusSelector]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 flex',
          variant === 'center' ? 'items-end justify-center p-0 sm:items-center sm:p-6' : 'items-end justify-end md:items-stretch',
        )}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          className={cn(
            'pointer-events-auto relative flex max-h-[92dvh] w-full flex-col bg-surface shadow-float outline-none',
            variant === 'center'
              ? 'animate-slide-in-up rounded-t-4xl sm:max-w-lg sm:animate-pop-in sm:rounded-4xl'
              : 'animate-slide-in-up rounded-t-4xl md:max-h-none md:max-w-[440px] md:animate-slide-in-right md:rounded-none md:rounded-l-4xl',
            className,
          )}
        >
          <div className={cn('flex items-start justify-between gap-3 px-5 pt-5 sm:px-6', hideTitle && 'sr-only')}>
            {titleAdornment}
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-xl font-semibold">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              )}
            </div>
            {!hideTitle && (
              <button type="button" onClick={onClose} className="btn btn-ghost btn-sm -mr-2 -mt-1 !min-h-[40px] !px-2.5" aria-label="Close">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
