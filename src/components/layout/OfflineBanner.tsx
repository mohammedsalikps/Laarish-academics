import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { cn } from '../../lib/cn';

/**
 * Offline (wireframe X4): calm and navy, never red. It stays until the
 * connection returns. Progress is saved on the device either way.
 */
export function OfflineBanner({ className }: { className?: string }) {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div role="status" className={cn('mx-auto flex max-w-6xl items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-bold text-white shadow-soft', className)}>
      <WifiOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <span>You're offline. Your progress is saved on this device, and the worlds and lessons you already opened still work.</span>
    </div>
  );
}
