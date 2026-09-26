/**
 * Calendar-date helpers working on ISO dates (YYYY-MM-DD) in UTC so results
 * never shift with the user's time zone or DST.
 */
import { language, locale } from '../i18n';

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
  const t = parseIso(s);
  // Round-trip so impossible dates such as 2026-13-45 or 2026-02-30 are rejected
  // instead of silently rolling over into another month.
  return Number.isFinite(t) && fromTime(t) === s.slice(0, 10);
}

/** True for a real recurring "MM-DD" date (29 February allowed). */
export function isValidMonthDay(md: string | null | undefined): md is string {
  if (!md || !/^\d{2}-\d{2}$/.test(md)) return false;
  return isValidIsoDate(`2000-${md}`);
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

/** Month names in the UI language, capitalised for standalone use (index 0 = January). */
export const MONTH_NAMES: string[] = Array.from({ length: 12 }, (_, i) => {
  const name = new Intl.DateTimeFormat(locale(), { month: 'long', timeZone: 'UTC' }).format(Date.UTC(2001, i, 1));
  return name.charAt(0).toUpperCase() + name.slice(1);
});

/** Short month names for compact spans ("May–Jul"); Finnish uses the conventional stems. */
export const MONTH_SHORT: string[] =
  language() === 'fi'
    ? ['tammi', 'helmi', 'maalis', 'huhti', 'touko', 'kesä', 'heinä', 'elo', 'syys', 'loka', 'marras', 'joulu']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string, style: 'short' | 'long' = 'short'): string {
  const t = parseIso(iso);
  // Finnish short dates are numeric ("15.5."); English keeps "15 May".
  const fi = language() === 'fi';
  return new Date(t).toLocaleDateString(locale(), {
    timeZone: 'UTC',
    day: 'numeric',
    month: style === 'long' ? 'long' : fi ? 'numeric' : 'short',
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
