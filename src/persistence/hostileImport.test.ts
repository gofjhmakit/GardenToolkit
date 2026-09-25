// @vitest-environment node
/**
 * Crafted or hand-edited project files must never crash the app, hang it, or
 * leave a project that opens but breaks exports. Each case below reproduces a
 * defect found in review.
 */
import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { createProject, makeObject } from '../domain/projectFactory';
import { addObjects, assignPlant } from '../editor/commands';
import { loadCoreCatalog } from '../test/fixtures';
import { makeLookup } from '../app/lookup';
import { generatePlantingCalendar } from '../engine/calendar';
import { computeAllPlantings } from '../engine/plantings';
import { calendarCsv, calendarIcs, objectsCsv, plantingsCsv } from '../reports/csv';
import { buildReport } from '../reports/builders';
import { toProjectFile } from './projectFile';
import { importProjectFile } from './projectPackage';

const catalog = loadCoreCatalog();
const known = (id: string) => catalog.plants.has(id);

/** A valid exported project file (plain JSON object) with one planted bed. */
function exportedFile() {
  const doc = createProject('Hostile', { now: new Date('2026-01-01'), location: { lastFrost: '05-20', firstFrost: '09-25' } });
  doc.settings.activeSeason = 2026;
  const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 2000, height: 1000 });
  addObjects(doc, [bed]);
  assignPlant(doc, [bed.id], 'allium-cepa');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return JSON.parse(JSON.stringify(toProjectFile(doc, [], (id) => catalog.get(id)))) as any;
}

async function importJson(file: unknown) {
  const res = await importProjectFile(new Blob([JSON.stringify(file)]), known);
  if (!res.ok) throw new Error(`import failed: ${res.error} ${res.details.join('; ')}`);
  return res;
}

/** Everything a user can do with an opened project that walks all its data. */
function exerciseExports(res: Awaited<ReturnType<typeof importJson>>) {
  const lookup = makeLookup(catalog, res.doc);
  generatePlantingCalendar(res.doc, lookup);
  computeAllPlantings(res.doc, lookup);
  objectsCsv(res.doc);
  plantingsCsv(res.doc, lookup);
  calendarCsv(res.doc, lookup);
  calendarIcs(res.doc, lookup);
  return lookup;
}

describe('hostile imports: ids that collide with Object.prototype', () => {
  it('drops layer entries such as "constructor" that do not name a real object', async () => {
    const file = exportedFile();
    const content = file.layers.find((l: { objects: string[] }) => l.objects.length);
    content.objects.push('constructor', 'toString', 'hasOwnProperty');
    const res = await importJson(file);
    const all = res.doc.layers.flatMap((l) => l.objectIds);
    expect(all).toHaveLength(1);
    expect(all.every((id) => Object.hasOwn(res.doc.objects, id))).toBe(true);
    expect(() => exerciseExports(res)).not.toThrow();
  });

  it('skips an object whose id is "__proto__" and the plantings that point at it', async () => {
    const file = exportedFile();
    file.objects[0].id = '__proto__';
    for (const l of file.layers) l.objects = l.objects.map(() => '__proto__');
    file.plantings[0].objectId = '__proto__';
    const res = await importJson(file);
    expect(Object.getPrototypeOf(res.doc.objects)).toBe(Object.prototype);
    expect(Object.keys(res.doc.objects)).toEqual([]);
    expect(Object.keys(res.doc.plantings)).toEqual([]);
    expect(res.warnings.join(' ')).toMatch(/reserved id/);
    expect(() => exerciseExports(res)).not.toThrow();
  });

  it('never resolves a plant id such as "toString" to a prototype function', async () => {
    const file = exportedFile();
    file.plantings[0].plantId = 'toString';
    const res = await importJson(file);
    const lookup = exerciseExports(res);
    expect(lookup('toString')).toBeUndefined();
    expect(lookup('constructor')).toBeUndefined();
    expect(res.warnings.join(' ')).toMatch(/not in your plant database/);
  });

  it('clears custom-task links to objects that do not exist', async () => {
    const file = exportedFile();
    file.calendar.tasks.push({ id: 't', title: 'Weed', start: '2026-06-01', end: null, objectId: 'constructor', notes: '', done: false });
    const res = await importJson(file);
    expect(res.doc.customTasks[0].objectId).toBeNull();
  });
});

describe('hostile imports: dates and text', () => {
  it('ignores impossible custom-task dates instead of crashing the iCal export', async () => {
    const file = exportedFile();
    file.calendar.tasks.push(
      { id: 'bad-start', title: 'Bad start', start: '2026-13-45', end: null, objectId: null, notes: '', done: false },
      { id: 'bad-end', title: 'Bad end', start: '2026-06-01', end: 'soon', objectId: null, notes: '', done: false },
    );
    const res = await importJson(file);
    const lookup = makeLookup(catalog, res.doc);
    const events = generatePlantingCalendar(res.doc, lookup).events;
    expect(events.find((e) => e.id === 'bad-start')).toBeUndefined();
    expect(events.find((e) => e.id === 'bad-end')).toMatchObject({ start: '2026-06-01', end: null });
    const ics = calendarIcs(res.doc, lookup);
    expect(ics).toContain('SUMMARY:Bad end');
    expect(ics).not.toContain('Bad start');
  });

  it('treats impossible frost dates as missing (placeholder + warning), not as rolled-over dates', async () => {
    const file = exportedFile();
    file.location.lastFrost = '13-40';
    const res = await importJson(file);
    const cal = generatePlantingCalendar(res.doc, makeLookup(catalog, res.doc));
    expect(cal.placeholderFrostDates).toBe(true);
    expect(cal.lastFrost.startsWith('2026-')).toBe(true);
    expect(cal.warnings.join(' ')).toMatch(/placeholder/);
  });

  it('keeps line breaks in task titles from starting new iCal properties', async () => {
    const file = exportedFile();
    file.calendar.tasks.push({ id: 't', title: 'Water\rATTACH:http://example.invalid/x\nX-EVIL:1', start: '2026-06-01', end: null, objectId: null, notes: '', done: false });
    const res = await importJson(file);
    const ics = calendarIcs(res.doc, makeLookup(catalog, res.doc));
    const lines = ics.replace(/\r\n /g, '').split('\r\n');
    expect(lines.some((l) => l.startsWith('ATTACH') || l.startsWith('X-EVIL'))).toBe(false);
    expect(lines).toContain('SUMMARY:Water\\nATTACH:http://example.invalid/x\\nX-EVIL:1');
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });
});

describe('hostile imports: sizes', () => {
  it('does not hang on absurd geometry (1e300 mm bed)', async () => {
    const file = exportedFile();
    file.objects[0].geometry = { type: 'rect', width: 1e300, height: 1e300 };
    const res = await importJson(file);
    const t = performance.now();
    const lookup = exerciseExports(res);
    const ctx = { doc: res.doc, lookup, companions: catalog.companions, rotationRules: catalog.rotationRules, sources: catalog.sources, now: new Date('2026-02-01') };
    buildReport('complete', ctx);
    expect(performance.now() - t).toBeLessThan(5000);
  });

  it('does not trust the uncompressed size declared in a ZIP header', async () => {
    // project.json claims to be 10 bytes but inflates to ~5 MB: extraction must stop at the declared size.
    const file = exportedFile();
    const big = strToU8(JSON.stringify({ ...file, padding: 'x'.repeat(5 * 1024 * 1024) }));
    const zipped = zipSync({ 'project.json': [big, { level: 9 }] });
    const view = new DataView(zipped.buffer);
    view.setUint32(22, 10, true); // local header: uncompressed size
    const centralDir = zipped.length - 22 - 46 - 'project.json'.length;
    view.setUint32(centralDir + 24, 10, true); // central directory: uncompressed size
    const res = await importProjectFile(new Blob([zipped as BlobPart]), known);
    expect(res.ok).toBe(false);
  });
});
