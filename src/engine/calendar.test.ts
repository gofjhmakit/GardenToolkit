import { describe, expect, it } from 'vitest';
import { createProject, makeObject } from '../domain/projectFactory';
import type { Planting, ProjectDoc } from '../domain/project';
import { loadCoreCatalog } from '../test/fixtures';
import { generatePlantingCalendar, groupEventsByMonth, resolveWindow } from './calendar';

const catalog = loadCoreCatalog();
const lookup = (id: string) => catalog.get(id);

function setup(plantIds: string[], location: Partial<ProjectDoc['location']> = { lastFrost: '05-20', firstFrost: '09-25' }) {
  const doc = createProject('Cal', { now: new Date('2026-01-10'), location });
  const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 3000, height: 1200 });
  doc.objects[bed.id] = bed;
  doc.layers.find((l) => l.id === bed.layerId)!.objectIds.push(bed.id);
  plantIds.forEach((plantId, i) => {
    const p: Planting = {
      id: `p${i}`, plantId, objectId: bed.id, season: 2026, variety: '', method: null, areaShare: null, spacing: {},
      quantityOverride: null, seedQuantityOverride: null, yieldOverride: null, dates: {}, status: 'planned', notes: '',
      createdAt: `2026-01-01T00:00:0${i}Z`,
    };
    doc.plantings[p.id] = p;
  });
  return { doc, bed };
}

describe('generatePlantingCalendar', () => {
  it('derives indoor sowing, transplanting and harvest for tomatoes from frost dates', () => {
    const { doc } = setup(['solanum-lycopersicum']);
    const cal = generatePlantingCalendar(doc, lookup);
    expect(cal.placeholderFrostDates).toBe(false);
    const sow = cal.events.find((e) => e.type === 'sow-indoors')!;
    expect(sow.start).toBe('2026-03-25'); // 8 weeks before 20 May
    expect(sow.end).toBe('2026-04-08');
    const tr = cal.events.find((e) => e.type === 'transplant')!;
    expect(tr.start).toBe('2026-05-27');
    const h = cal.events.find((e) => e.type === 'harvest')!;
    expect(h.start > tr.start).toBe(true);
    expect(h.end! <= '2026-09-25').toBe(true); // capped at first frost for tender crop
    expect(cal.events.some((e) => e.type === 'prepare')).toBe(true);
  });

  it('generates succession sowings for direct-sown crops', () => {
    const { doc } = setup(['raphanus-sativus']);
    const cal = generatePlantingCalendar(doc, lookup);
    expect(cal.events.filter((e) => e.type === 'succession').length).toBeGreaterThan(2);
  });

  it('warns and uses explicit placeholder dates when frost dates are missing', () => {
    const { doc } = setup(['solanum-lycopersicum'], {});
    const cal = generatePlantingCalendar(doc, lookup);
    expect(cal.placeholderFrostDates).toBe(true);
    expect(cal.warnings[0]).toMatch(/Frost dates are not set/);
  });

  it('applies user overrides and planting dates without losing them on regeneration', () => {
    const { doc } = setup(['solanum-lycopersicum']);
    doc.plantings.p0.dates.transplant = '2026-06-05';
    doc.calendarOverrides['p0:sow-indoors'] = { start: '2026-03-01', done: true };
    doc.calendarOverrides['p0:harvest'] = { hidden: true };
    const cal = generatePlantingCalendar(doc, lookup);
    expect(cal.events.find((e) => e.type === 'transplant')!.start).toBe('2026-06-05');
    const sow = cal.events.find((e) => e.type === 'sow-indoors')!;
    expect(sow.start).toBe('2026-03-01');
    expect(sow.overridden).toBe(true);
    expect(sow.done).toBe(true);
    expect(cal.events.find((e) => e.type === 'harvest')).toBeUndefined();
  });

  it('shifts fixed windows for the southern hemisphere', () => {
    const a = { year: 2026, lastFrost: '2026-09-15', firstFrost: '2026-05-01', southern: true };
    const w = resolveWindow({ relativeTo: 'fixed', start: '07-15', end: '08-20' }, a);
    expect(w.start.slice(5, 7)).toBe('01');
  });

  it('handles autumn-planted crops that are harvested the following year', () => {
    const { doc } = setup(['allium-sativum']);
    const cal = generatePlantingCalendar(doc, lookup);
    const plantOut = cal.events.find((e) => e.type === 'plant-out')!;
    expect(plantOut.start.startsWith('2026-08') || plantOut.start.startsWith('2026-09')).toBe(true);
    const h = cal.events.find((e) => e.type === 'harvest')!;
    expect(h.start.startsWith('2027')).toBe(true);
  });

  it('groups events by month', () => {
    const { doc } = setup(['solanum-lycopersicum', 'daucus-carota-sativus']);
    const cal = generatePlantingCalendar(doc, lookup);
    const g = groupEventsByMonth(cal.events);
    expect([...g.keys()]).toEqual([...g.keys()].sort());
  });
});
