const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const utcFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

export function formatUtc(iso: string): string {
  return `${utcFormat.format(new Date(iso))} UTC`;
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatBeforeScan(iso: string, scannedAtIso: string): string {
  const elapsed = Math.max(0, Date.parse(scannedAtIso) - Date.parse(iso));

  if (elapsed < MINUTE_MS) {
    return 'At scan time';
  }
  if (elapsed < 2 * HOUR_MS) {
    return `${Math.round(elapsed / MINUTE_MS)} min before scan`;
  }
  if (elapsed < 2 * DAY_MS) {
    return `${Math.round(elapsed / HOUR_MS)} h before scan`;
  }
  return `${Math.round(elapsed / DAY_MS)} days before scan`;
}

export function formatElapsed(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds} s`;
  }
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`;
}
