/**
 * Plant-level season summaries (independent of any planting), used by the
 * plant browser for "Harvest: Jul–Sep" style summaries and month filters.
 */
import type { LocationSettings } from '../domain/project';
import { addDays, MONTH_SHORT, monthDayToIso, monthOf } from '../lib/dates';
import type { Plant } from '../plants/schema';
import { resolveWindow } from './calendar';
import { frostDates, isSouthernHemisphere } from './climate';

export interface SeasonAnchors {
  year: number;
  lastFrost: string;
  firstFrost: string;
  southern: boolean;
}

export function anchorsFor(loc: LocationSettings, year: number): SeasonAnchors {
  const fd = frostDates(loc);
  return {
    year,
    lastFrost: monthDayToIso(year, fd.lastFrost),
    firstFrost: monthDayToIso(year, fd.firstFrost),
    southern: isSouthernHemisphere(loc),
  };
}

export interface Span {
  start: string;
  end: string;
}

export interface PlantSeasons {
  sow: Span | null;
  plant: Span | null;
  harvest: Span | null;
}

function monthsOf(span: Span | null): Set<number> {
  const out = new Set<number>();
  if (!span) return out;
  let d = span.start;
  let guard = 0;
  while (d <= span.end && guard++ < 400) {
    out.add(monthOf(d));
    d = addDays(d, 7);
  }
  out.add(monthOf(span.end));
  return out;
}

export function plantSeasons(plant: Plant, a: SeasonAnchors): PlantSeasons {
  const t = plant.timing;
  const r = (w: typeof t.sowIndoors) => (w ? resolveWindow(w, a) : null);
  const sowSpans = [r(t.sowIndoors), r(t.directSow)].filter(Boolean) as Span[];
  const sow = sowSpans.length
    ? { start: sowSpans.map((s) => s.start).sort()[0], end: sowSpans.map((s) => s.end).sort().reverse()[0] }
    : null;
  const plantWin = r(t.transplant) ?? r(t.plantOut);
  let harvest: Span | null = null;
  if (t.daysToMaturity) {
    const from = t.maturityFrom === 'transplant' ? plantWin ?? sow : sow ?? plantWin;
    if (from) {
      harvest = {
        start: addDays(from.start, t.daysToMaturity.min),
        end: addDays(from.end, t.daysToMaturity.max + (t.harvestDurationWeeks?.max ?? 0) * 7),
      };
      if (t.harvest) {
        const cap = resolveWindow(t.harvest, a);
        if (cap.end > harvest.start && cap.end < harvest.end) harvest.end = cap.end;
      }
    }
  }
  if (!harvest && t.harvest) harvest = r(t.harvest);
  return { sow, plant: plantWin, harvest };
}

const SHORT = MONTH_SHORT;

export function formatMonthSpan(span: Span | null): string | null {
  if (!span) return null;
  const a = monthOf(span.start);
  const b = monthOf(span.end);
  return a === b ? SHORT[a - 1] : `${SHORT[a - 1]}–${SHORT[b - 1]}`;
}

export function spanIncludesMonth(span: Span | null, month: number): boolean {
  return monthsOf(span).has(month);
}
