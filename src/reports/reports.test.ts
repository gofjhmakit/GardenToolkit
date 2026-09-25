import { describe, expect, it } from 'vitest';
import { createProject, makeObject } from '../domain/projectFactory';
import { addObjects, assignPlant } from '../editor/commands';
import { loadCoreCatalog } from '../test/fixtures';
import { buildReport, collectRows, gardenStats, generateCareGuide, type ReportContext } from './builders';
import { calendarCsv, calendarIcs, csvCell, objectsCsv, plantingsCsv, toCsv } from './csv';
import { pdfText } from './pdf';
import type { Block, ReportKind } from './model';

const catalog = loadCoreCatalog();

function sample(withPlants = true) {
  const doc = createProject('Report garden', { now: new Date('2026-02-01'), location: { country: 'Finland', lastFrost: '05-20', firstFrost: '09-25', climateSystem: 'finnish-zone', climateZone: 'II' } });
  const bed = makeObject(doc, 'vegetable-bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 3000, height: 1200 }, { props: { sunLevel: 'shade', notes: '=cmd|calc' } });
  const lawn = makeObject(doc, 'lawn', { x: 5000, y: 0, rotation: 0 }, { type: 'rect', width: 5000, height: 4000 });
  const tree = makeObject(doc, 'tree', { x: -4000, y: 0, rotation: 0 }, { type: 'ellipse', rx: 2000, ry: 2000 });
  addObjects(doc, [bed, lawn, tree]);
  if (withPlants) {
    assignPlant(doc, [bed.id], 'solanum-lycopersicum');
    assignPlant(doc, [bed.id], 'solanum-tuberosum');
    assignPlant(doc, [bed.id], 'tagetes-patula');
    assignPlant(doc, [tree.id], 'malus-domestica');
  }
  const ctx: ReportContext = {
    doc,
    lookup: (id) => catalog.get(id),
    companions: catalog.companions,
    rotationRules: catalog.rotationRules,
    sources: catalog.sources,
    now: new Date('2026-02-01T10:00:00Z'),
  };
  return { doc, bed, ctx };
}

const text = (blocks: Block[]) => JSON.stringify(blocks);
const KINDS: ReportKind[] = ['planting-plan', 'garden-design', 'care-guide', 'calendar', 'harvest-plan', 'complete'];

describe('report builders', () => {
  it.each(KINDS)('builds %s deterministically, with and without plants', (kind) => {
    const { ctx } = sample();
    const a = buildReport(kind, ctx);
    const b = buildReport(kind, ctx);
    expect(a).toEqual(b);
    expect(a.title.length).toBeGreaterThan(3);
    expect(a.blocks.length).toBeGreaterThan(0);
    const empty = buildReport(kind, sample(false).ctx);
    expect(empty.blocks.length).toBeGreaterThan(0);
  });
  it('planting plan lists areas, quantities, companion evidence and warnings', () => {
    const t = text(buildReport('planting-plan', sample().ctx).blocks);
    expect(t).toContain('V1');
    expect(t).toContain('Tomato');
    expect(t).toMatch(/Documented/); // potato–tomato late blight
    expect(t).toContain('"type":"plan"');
  });
  it('care guide groups plants by category and includes care fields and warnings', () => {
    const r = generateCareGuide(sample().ctx);
    const headings = r.blocks.filter((b) => b.type === 'heading').map((b) => (b as { text: string }).text);
    expect(headings).toContain('Vegetables');
    expect(headings).toContain('Fruit trees');
    expect(headings).toContain('Flowers');
    const t = text(r.blocks);
    expect(t).toContain('Watering');
    expect(t).toContain('Diseases');
    expect(t).toMatch(/sun/i); // shade bed warning for tomato
  });
  it('complete report only totals meaningful data and lists sources', () => {
    const { ctx, doc } = sample();
    const rows = collectRows(doc, ctx.lookup);
    const stats = gardenStats(doc, rows);
    expect(stats.harvest.excluded).toBe(1); // marigold has no yield data
    expect(stats.varieties).toBe(4);
    expect(stats.byKind.find((k) => k.label === 'Lawn')?.areaM2).toBeCloseTo(20);
    const t = text(buildReport('complete', ctx).blocks);
    expect(t).toContain('Garden Toolkit editorial seed data');
    expect(t).toContain('Trees and shrubs');
    expect(t).toContain('Warnings');
  });
  it('harvest plan states assumptions', () => {
    expect(text(buildReport('harvest-plan', sample().ctx).blocks)).toContain('Assumptions');
  });
});

describe('CSV / iCal exports', () => {
  it('quotes and neutralises formula injection', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-5')).toBe('-5');
    expect(csvCell(null)).toBe('');
    expect(toCsv(['a'], [[1], [2]])).toBe('a\r\n1\r\n2\r\n');
  });
  it('exports plantings, objects and calendar', () => {
    const { doc, ctx } = sample();
    const p = plantingsCsv(doc, ctx.lookup);
    expect(p.split('\r\n')[0]).toContain('calculated_plants');
    expect(p).toContain('Solanum lycopersicum');
    const o = objectsCsv(doc);
    expect(o).toContain("'=cmd|calc");
    const c = calendarCsv(doc, ctx.lookup);
    expect(c).toContain('Sow indoors');
    const ics = calendarIcs(doc, ctx.lookup, new Date('2026-01-01T00:00:00Z'));
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics).toContain('DTSTART;VALUE=DATE:2026');
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
  });
});

describe('PDF text sanitising', () => {
  it('maps symbols outside the standard PDF fonts', () => {
    expect(pdfText('≈ 5 m² · ✓ ☐ → ⌀ 3')).toBe('~ 5 m² · x [ ] -> Ø 3');
    expect(pdfText('Päärynäpuu – 5 × 3 “ok”')).toBe('Päärynäpuu – 5 × 3 “ok”');
    expect(pdfText('漢字')).toBe('??');
  });
});
