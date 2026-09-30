const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const STALE_AFTER_INTERVALS = 3;

export function ageMs(scannedAt: string, now: number): number {
  return Math.max(0, now - Date.parse(scannedAt));
}

export function isStale(age: number, intervalMinutes: number): boolean {
  return age > STALE_AFTER_INTERVALS * intervalMinutes * MINUTE_MS;
}

export function formatAge(age: number): string {
  if (age < MINUTE_MS) {
    return 'just now';
  }
  if (age < HOUR_MS) {
    return `${Math.floor(age / MINUTE_MS)} min ago`;
  }
  if (age < DAY_MS) {
    return `${Math.floor(age / HOUR_MS)} h ago`;
  }
  return `${Math.floor(age / DAY_MS)} days ago`;
}
