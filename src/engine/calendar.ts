/**
 * Project-specific planting calendar generation.
 *
 * Events are derived from the plantings in the project, the plant timing
 * data and the project's frost dates. User edits are stored separately as
 * overrides keyed by the event id, so regenerating never loses them.
 */
import type { ProjectDoc } from '../domain/project';
import { addDays, addWeeks, formatDate, isValidIsoDate, maxIso, monthDayToIso, minIso } from '../lib/dates';
import type { Plant, TimingWindow } from '../plants/schema';
import { frostDates, isSouthernHemisphere } from './climate';
import type { PlantLookup } from './plantings';
import { plantDisplayName } from '../plants/names';
// Imported as `tr`: `t` is used below for a plant's timing data.
import { t as tr, tn } from '../i18n';

export type CalendarEventType =
  | 'prepare'
  | 'sow-indoors'
  | 'direct-sow'
  | 'transplant'
  | 'plant-out'
  | 'succession'
  | 'harvest'
  | 'custom';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  start: string;
  end: string | null;
  plantingId: string | null;
  plantId: string | null;
  objectIds: string[];
  /** How the date was derived, for transparency. */
  basis: string;
  overridden: boolean;
  done: boolean;
  note: string;
  warnings: string[];
}

export interface CalendarResult {
  events: CalendarEvent[];
  placeholderFrostDates: boolean;
  lastFrost: string;
  firstFrost: string;
  warnings: string[];
}

interface Anchors {
  year: number;
  lastFrost: string;
  firstFrost: string;
  southern: boolean;
}

/** Resolves a timing window to concrete dates for a season. */
export function resolveWindow(w: TimingWindow, a: Anchors): { start: string; end: string; basis: string } {
  if (w.relativeTo === 'fixed') {
    let start = monthDayToIso(a.year, w.start);
    let end = monthDayToIso(a.year, w.end);
    if (a.southern) {
      start = addDays(start, 182);
      end = addDays(end, 182);
    }
    if (end < start) end = monthDayToIso(a.year + 1, w.end);
    return { start, end, basis: a.southern ? tr('Fixed seasonal window (shifted for southern hemisphere)') : tr('Fixed seasonal window') };
  }
  const anchor = w.relativeTo === 'lastFrost' ? a.lastFrost : a.firstFrost;
  const last = w.relativeTo === 'lastFrost';
  const describe = (wk: number) => {
    if (wk === 0) return last ? tr('at last spring frost') : tr('at first autumn frost');
    const n = Math.abs(wk);
    if (wk < 0) return last ? tn('{{count}} wk before last spring frost', n) : tn('{{count}} wk before first autumn frost', n);
    return last ? tn('{{count}} wk after last spring frost', n) : tn('{{count}} wk after first autumn frost', n);
  };
  return {
    start: addWeeks(anchor, w.startWeeks),
    end: addWeeks(anchor, w.endWeeks),
    basis: w.startWeeks === w.endWeeks ? describe(w.startWeeks) : tr('{{from}} to {{to}}', { from: describe(w.startWeeks), to: describe(w.endWeeks) }),
  };
}

function eventTitle(type: CalendarEventType, name: string, where: string): string {
  const verb: Record<CalendarEventType, string> = {
    prepare: tr('Prepare'),
    'sow-indoors': tr('Sow indoors:'),
    'direct-sow': tr('Sow outdoors:'),
    transplant: tr('Transplant:'),
    'plant-out': tr('Plant:'),
    succession: tr('Succession sow:'),
    harvest: tr('Harvest:'),
    custom: '',
  };
  return `${verb[type]} ${name}${where ? ` (${where})` : ''}`.trim();
}

/** Harvest window from explicit data, or maturity days from the sowing/transplant date. */
function harvestWindow(
  plant: Plant,
  a: Anchors,
  sowStart: string | null,
  transplantStart: string | null,
): { start: string; end: string; basis: string } | null {
  const t = plant.timing;
  const dtm = t.daysToMaturity;
  if (dtm) {
    const from = t.maturityFrom === 'transplant' ? transplantStart ?? sowStart : sowStart ?? transplantStart;
    if (from) {
      const start = addDays(from, dtm.min);
      const durWeeks = t.harvestDurationWeeks?.max ?? 0;
      let end = addDays(from, dtm.max + durWeeks * 7);
      // Crops with a known seasonal harvest limit (e.g. until autumn frost) are capped by it.
      if (t.harvest) {
        const w = resolveWindow(t.harvest, a);
        if (w.end > start) end = minIso(end, w.end);
      }
      end = maxIso(end, start);
      return {
        start,
        end,
        basis:
          (t.maturityFrom === 'transplant'
            ? tr('{{min}}–{{max}} days to maturity from transplanting', { min: dtm.min, max: dtm.max })
            : tr('{{min}}–{{max}} days to maturity from sowing', { min: dtm.min, max: dtm.max })) +
          (t.harvestDurationWeeks ? tr(', harvest lasting up to {{weeks}} weeks', { weeks: durWeeks }) : ''),
      };
    }
  }
  if (t.harvest) return resolveWindow(t.harvest, a);
  return null;
}

export function generatePlantingCalendar(
  doc: ProjectDoc,
  lookup: PlantLookup,
  opts: { season?: number; language?: string } = {},
): CalendarResult {
  const season = opts.season ?? doc.settings.activeSeason;
  const fd = frostDates(doc.location);
  const anchors: Anchors = {
    year: season,
    lastFrost: monthDayToIso(season, fd.lastFrost),
    firstFrost: monthDayToIso(season, fd.firstFrost),
    southern: isSouthernHemisphere(doc.location),
  };
  if (anchors.firstFrost < anchors.lastFrost) anchors.firstFrost = monthDayToIso(season + 1, fd.firstFrost);

  const events: CalendarEvent[] = [];
  const warnings: string[] = [];
  if (fd.placeholder) {
    warnings.push(
      tr('Frost dates are not set for this project; placeholder dates ({{last}} / {{first}}) are used. Set your location for accurate timing.', { last: formatDate(fd.lastFrost), first: formatDate(fd.firstFrost) }),
    );
  }

  const earliestWorkByObject = new Map<string, string>();
  const plantings = Object.values(doc.plantings).filter((p) => p.season === season);

  for (const planting of plantings) {
    const plant = lookup(planting.plantId);
    const host = doc.objects[planting.objectId];
    if (!host) continue;
    const where = host.code || host.name;
    const name = plant ? plantDisplayName(plant, opts.language) : planting.plantId;
    const label = planting.variety ? `${name} '${planting.variety}'` : name;
    const t = plant?.timing;
    const push = (
      type: CalendarEventType,
      win: { start: string; end: string; basis: string } | null,
      userStart: string | null | undefined,
      extraWarnings: string[] = [],
    ) => {
      if (!win && !isValidIsoDate(userStart)) return null;
      const start = isValidIsoDate(userStart) ? userStart : win!.start;
      const end = win ? (isValidIsoDate(userStart) ? addDays(userStart, Math.max(0, diff(win.start, win.end))) : win.end) : null;
      const ev: CalendarEvent = {
        id: `${planting.id}:${type}`,
        type,
        title: eventTitle(type, label, where),
        start,
        end,
        plantingId: planting.id,
        plantId: planting.plantId,
        objectIds: [host.id],
        basis: isValidIsoDate(userStart) ? tr('Date set on the planting') : win?.basis ?? '',
        overridden: false,
        done: false,
        note: '',
        warnings: extraWarnings,
      };
      events.push(ev);
      return ev;
    };

    if (!t) continue;
    const indoor = t.sowIndoors ? resolveWindow(t.sowIndoors, anchors) : null;
    const direct = t.directSow ? resolveWindow(t.directSow, anchors) : null;
    const transplant = t.transplant ? resolveWindow(t.transplant, anchors) : null;
    const plantOut = t.plantOut ? resolveWindow(t.plantOut, anchors) : null;

    const method = planting.method ?? plant?.planting.methods[0];
    // Prefer the propagation route that matches the data; plants with both
    // routes default to indoor sowing + transplant unless sown directly.
    const useDirect = !!direct && (!indoor || method === 'rows' || method === 'broadcast');
    const sIndoor = !useDirect && indoor ? push('sow-indoors', indoor, planting.dates.sowIndoors) : null;
    const sDirect = useDirect ? push('direct-sow', direct, planting.dates.directSow) : null;
    const sTrans = !useDirect && transplant ? push('transplant', transplant, planting.dates.transplant) : null;
    const sOut = plantOut ? push('plant-out', plantOut, planting.dates.transplant) : null;

    if (sDirect && t.successionIntervalDays && direct) {
      const interval = t.successionIntervalDays.max;
      let d = addDays(sDirect.start, interval);
      let n = 1;
      while (d <= direct.end && n <= 6) {
        events.push({
          ...sDirect,
          id: `${planting.id}:succession-${n}`,
          type: 'succession',
          title: eventTitle('succession', label, where),
          start: d,
          end: null,
          basis: tr('Every {{min}}–{{max}} days while the sowing window lasts', { min: t.successionIntervalDays.min, max: t.successionIntervalDays.max }),
        });
        d = addDays(d, interval);
        n++;
      }
    }

    const sowStart = sDirect?.start ?? sIndoor?.start ?? null;
    const transStart = sTrans?.start ?? sOut?.start ?? null;
    const hw = plant ? harvestWindow(plant, anchors, sowStart, transStart) : null;
    const harvestWarnings: string[] = [];
    if (hw && plant?.growing.frostTolerance === 'tender' && hw.end > anchors.firstFrost) {
      harvestWarnings.push(tr('Harvest window extends past the average first frost; protect the crop or harvest earlier.'));
    }
    if (hw && hw.start > anchors.firstFrost && plant?.lifecycle === 'annual') {
      harvestWarnings.push(tr('The crop may not mature before the first autumn frost at this location.'));
    }
    let harvestYearNote = '';
    const yrs = t.yearsToFirstHarvest;
    if (yrs && yrs.min >= 1 && plant?.lifecycle !== 'annual') {
      harvestYearNote = ' ' + tr('First harvest typically {{years}} year(s) after planting.', { years: yrs.min === yrs.max ? yrs.min : `${yrs.min}–${yrs.max}` });
    }
    if (hw || isValidIsoDate(planting.dates.harvestStart)) {
      const ev = push('harvest', hw ? { ...hw, basis: hw.basis + harvestYearNote } : null, planting.dates.harvestStart, harvestWarnings);
      if (ev && isValidIsoDate(planting.dates.harvestEnd)) ev.end = planting.dates.harvestEnd;
    }

    const firstWork = [sDirect?.start, sTrans?.start, sOut?.start].filter((d): d is string => !!d).sort()[0];
    if (firstWork) {
      const prev = earliestWorkByObject.get(host.id);
      if (!prev || firstWork < prev) earliestWorkByObject.set(host.id, firstWork);
    }
  }

  for (const [objectId, first] of earliestWorkByObject) {
    const host = doc.objects[objectId];
    events.push({
      id: `${objectId}:prepare:${season}`,
      type: 'prepare',
      title: tr('Prepare {{area}}', { area: `${host.code ? `${host.code} ` : ''}${host.name}` }),
      start: addDays(first, -14),
      end: addDays(first, -1),
      plantingId: null,
      plantId: null,
      objectIds: [objectId],
      basis: tr('Two weeks before the first sowing/planting in this area'),
      overridden: false,
      done: false,
      note: '',
      warnings: [],
    });
  }

  for (const task of doc.customTasks) {
    // Tasks with an impossible start date cannot be placed on the calendar.
    if (!isValidIsoDate(task.start) || !task.start.startsWith(String(season))) continue;
    events.push({
      id: task.id,
      type: 'custom',
      title: task.title,
      start: task.start.slice(0, 10),
      end: isValidIsoDate(task.end) ? task.end.slice(0, 10) : null,
      plantingId: null,
      plantId: null,
      objectIds: task.objectId ? [task.objectId] : [],
      basis: tr('Custom task'),
      overridden: false,
      done: task.done,
      note: task.notes,
      warnings: [],
    });
  }

  // Apply user overrides.
  const visible: CalendarEvent[] = [];
  for (const ev of events) {
    const o = doc.calendarOverrides[ev.id];
    if (o) {
      if (o.hidden) continue;
      if (isValidIsoDate(o.start)) {
        ev.start = o.start;
        ev.overridden = true;
      }
      if (o.end !== undefined) ev.end = isValidIsoDate(o.end) ? o.end : ev.end;
      if (o.done !== undefined) ev.done = o.done;
      if (o.note) ev.note = o.note;
    }
    if (ev.end && ev.end < ev.start) ev.end = ev.start;
    visible.push(ev);
  }

  visible.sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  return {
    events: visible,
    placeholderFrostDates: fd.placeholder,
    lastFrost: anchors.lastFrost,
    firstFrost: anchors.firstFrost,
    warnings,
  };
}

function diff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** Groups events by calendar month (1–12) of their start date. */
export function groupEventsByMonth(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const out = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = e.start.slice(0, 7);
    const list = out.get(key) ?? [];
    list.push(e);
    out.set(key, list);
  }
  return out;
}
