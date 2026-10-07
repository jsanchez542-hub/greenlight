import type { Lang, Messages } from '@/i18n';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const dateFormats = new Map<Lang, Intl.DateTimeFormat>();

function dateFormat(lang: Lang): Intl.DateTimeFormat {
  let format = dateFormats.get(lang);
  if (format === undefined) {
    format = new Intl.DateTimeFormat(lang === 'es' ? 'es' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'UTC',
    });
    dateFormats.set(lang, format);
  }
  return format;
}

export function formatUtc(iso: string, lang: Lang): string {
  return `${dateFormat(lang).format(new Date(iso))} UTC`;
}

export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(lang).format(value);
}

export function formatBeforeScan(iso: string, scannedAtIso: string, t: Messages): string {
  const elapsed = Math.max(0, Date.parse(scannedAtIso) - Date.parse(iso));

  if (elapsed < MINUTE_MS) {
    return t.age.atScan;
  }
  if (elapsed < 2 * HOUR_MS) {
    return t.age.minutesBefore(Math.round(elapsed / MINUTE_MS));
  }
  if (elapsed < 2 * DAY_MS) {
    return t.age.hoursBefore(Math.round(elapsed / HOUR_MS));
  }
  return t.age.daysBefore(Math.round(elapsed / DAY_MS));
}

export function formatElapsed(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds} s`;
  }
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`;
}
