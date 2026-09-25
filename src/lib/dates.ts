/**
 * Calendar-date helpers working on ISO dates (YYYY-MM-DD) in UTC so results
 * never shift with the user's time zone or DST.
 */
const DAY = 86_400_000;

export function isoDate(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}

export function parseIso(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

export function isValidIsoDate(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return false;
  return Number.isFinite(parseIso(s));
}

export function fromTime(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return fromTime(parseIso(iso) + Math.round(days) * DAY);
}

export function addWeeks(iso: string, weeks: number): string {
  return addDays(iso, weeks * 7);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseIso(b) - parseIso(a)) / DAY);
}

/** Turns "MM-DD" into an ISO date within the given year. */
export function monthDayToIso(year: number, md: string): string {
  const [m, d] = md.split('-').map(Number);
  return isoDate(year, m, d);
}

export function monthOf(iso: string): number {
  return Number(iso.slice(5, 7));
}

export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatDate(iso: string, style: 'short' | 'long' = 'short'): string {
  const t = parseIso(iso);
  return new Date(t).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: style === 'long' ? 'numeric' : undefined,
  });
}

export function formatDateRange(start: string, end: string | null | undefined): string {
  if (!end || end === start) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function minIso(a: string, b: string): string {
  return a <= b ? a : b;
}

export function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}
