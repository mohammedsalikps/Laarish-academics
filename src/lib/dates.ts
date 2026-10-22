/** Local calendar date (YYYY-MM-DD) for an ISO timestamp, in the device's time zone. */
export function localDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Whole days from date key `a` to date key `b` (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const utcA = Date.UTC(ay, am - 1, ad);
  const utcB = Date.UTC(by, bm - 1, bd);
  return Math.round((utcB - utcA) / 86_400_000);
}

/** Date key shifted by `days` (negative for the past). */
export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMin = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} h ago`;
  const days = daysBetween(localDateKey(iso), localDateKey(now));
  if (days === 1) return 'Yesterday';
  return formatShortDate(iso);
}
