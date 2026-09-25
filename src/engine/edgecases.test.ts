import { describe, expect, it } from 'vitest';
import { calculatePlantCapacity, countLattice, resolveRowAxis } from './capacity';
import { checkHardiness, finnishZoneNumber, frostDates, frostFreeDays, isSouthernHemisphere, usdaZoneNumber, CLIMATE_PRESETS } from './climate';
import { matchesEndpoint, findCompanionRelations, relationsForPlant } from './companions';
import { checkContainer, checkSuitability, plantMinSunHours, sunLevelFromHours } from './suitability';
import { anchorsFor, formatMonthSpan, plantSeasons, spanIncludesMonth } from './plantSeasons';
import { computeObjectPlantings, defaultMethod, resolveRules } from './plantings';
import { createProject, defaultLocation, makeObject } from '../domain/projectFactory';
import { loadCoreCatalog } from '../test/fixtures';
import type { Planting } from '../domain/project';
import { polygonArea, type Vec } from '../domain/geometry';

const catalog = loadCoreCatalog();
const P = (id: string) => catalog.get(id)!;

describe('capacity edge cases', () => {
  const L: Vec[] = [
    { x: 0, y: 0 },
    { x: 3000, y: 0 },
    { x: 3000, y: 1000 },
    { x: 1000, y: 1000 },
    { x: 1000, y: 3000 },
    { x: 0, y: 3000 },
  ];
  it('handles concave (L-shaped) beds with multiple row segments', () => {
    const r = calculatePlantCapacity({ region: L, rules: { method: 'grid', inRowMm: { min: 250, max: 250 }, rowMm: null }, rowAxis: 'x' });
    // Two rectangles: 3000×1000 (12×4=48) and 1000×2000 (4×8=32) → 80 if perfectly split; lattice gives close value
    expect(r.plants!).toBeGreaterThanOrEqual(72);
    expect(r.plants!).toBeLessThanOrEqual(80);
    // A U-shape produces two separate segments on the rows crossing both arms.
    const U: Vec[] = [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 3000 }, { x: 2000, y: 3000 }, { x: 2000, y: 1000 }, { x: 1000, y: 1000 }, { x: 1000, y: 3000 }, { x: 0, y: 3000 }];
    const u = calculatePlantCapacity({ region: U, rules: { method: 'grid', inRowMm: { min: 250, max: 250 }, rowMm: null }, rowAxis: 'x' });
    expect(u.rowLines.length).toBeGreaterThan(u.rows!);
  });
  it('truncates stored positions for huge areas but still counts all plants', () => {
    const region = [{ x: 0, y: 0 }, { x: 100000, y: 0 }, { x: 100000, y: 10000 }, { x: 0, y: 10000 }];
    const r = calculatePlantCapacity({ region, rules: { method: 'rows', inRowMm: { min: 50, max: 50 }, rowMm: { min: 200, max: 200 } }, maxPositions: 1000 });
    expect(r.plants).toBe(50 * 2000); // 50 rows × 2000 plants
    expect(r.positions).toHaveLength(1000);
    expect(r.positionsTruncated).toBe(true);
  });
  it('respects explicit edge margins', () => {
    const rect = [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }, { x: 0, y: 1000 }];
    const tight = calculatePlantCapacity({ region: rect, rules: { method: 'grid', inRowMm: { min: 100, max: 100 }, rowMm: null, edgeMarginMm: 0 } });
    const loose = calculatePlantCapacity({ region: rect, rules: { method: 'grid', inRowMm: { min: 100, max: 100 }, rowMm: null, edgeMarginMm: 200 } });
    expect(tight.plants).toBe(121);
    expect(loose.plants).toBe(49);
  });
  it('rejects degenerate regions', () => {
    const r = calculatePlantCapacity({ region: [{ x: 0, y: 0 }, { x: 1, y: 1 }], rules: { method: 'grid', inRowMm: { min: 100, max: 100 }, rowMm: null } });
    expect(r.plants).toBeNull();
    expect(r.warnings[0]).toMatch(/no measurable size/);
    expect(countLattice([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 0, 10, 1, 1, 'square', 10).count).toBe(0);
  });
  it('broadcast without data warns; with density estimates plants', () => {
    const rect = [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }, { x: 0, y: 1000 }];
    const r = calculatePlantCapacity({ region: rect, rules: { method: 'broadcast', inRowMm: null, rowMm: null } });
    expect(r.warnings[0]).toMatch(/sowing-rate/);
    const d = calculatePlantCapacity({ region: rect, rules: { method: 'broadcast', inRowMm: { min: 100, max: 200 }, rowMm: null } });
    expect(d.plantsRange).toEqual({ min: 25, max: 100 });
  });
  it('seed estimate via seeds per station and germination rate', () => {
    const rect = [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }, { x: 0, y: 1000 }];
    const a = calculatePlantCapacity({ region: rect, rules: { method: 'grid', inRowMm: { min: 250, max: 250 }, rowMm: null, seedsPerStation: { min: 2, max: 3 } } });
    expect(a.seeds).toEqual({ min: 32, max: 48 });
    const g = calculatePlantCapacity({ region: rect, rules: { method: 'grid', inRowMm: { min: 250, max: 250 }, rowMm: null, germinationRate: { min: 0.5, max: 0.8 } } });
    expect(g.seeds).toEqual({ min: 20, max: 32 });
  });
  it('resolves row axis', () => {
    expect(resolveRowAxis([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }], 'auto')).toBe('x');
    expect(resolveRowAxis([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 10 }], 'auto')).toBe('y');
    expect(resolveRowAxis([], 'y')).toBe('y');
  });
  it('capacity is invariant to where the region sits', () => {
    const rules = { method: 'rows' as const, inRowMm: { min: 50, max: 50 }, rowMm: { min: 200, max: 200 } };
    const a = [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 1200 }, { x: 0, y: 1200 }];
    const b = a.map((p) => ({ x: p.x + 12345, y: p.y - 999 }));
    expect(calculatePlantCapacity({ region: a, rules }).plants).toBe(calculatePlantCapacity({ region: b, rules }).plants);
    expect(polygonArea(a)).toBe(polygonArea(b));
  });
});

describe('plantings resolution', () => {
  const planting = (extra: Partial<Planting>): Planting => ({
    id: 'p', plantId: 'solanum-lycopersicum', objectId: 'o', season: 2026, variety: '', method: null, areaShare: null, spacing: {}, quantityOverride: null,
    seedQuantityOverride: null, yieldOverride: null, dates: {}, status: 'planned', notes: '', createdAt: '2026-01-01T00:00:00Z', ...extra,
  });
  it('defaults methods by host and plant', () => {
    const doc = createProject('x');
    const tree = makeObject(doc, 'tree', { x: 0, y: 0, rotation: 0 }, { type: 'ellipse', rx: 1000, ry: 1000 });
    expect(defaultMethod(P('malus-domestica'), tree)).toBe('individual');
    expect(defaultMethod(P('lactuca-sativa'))).toBe('grid');
    expect(defaultMethod(undefined)).toBe('spaced');
  });
  it('converts cm data to mm and applies overrides', () => {
    const r = resolveRules(planting({}), P('solanum-lycopersicum'));
    expect(r.inRowMm).toEqual({ min: 450, max: 600 });
    const o = resolveRules(planting({ spacing: { inRowMm: 500, rowMm: 800, pattern: 'triangular' } }), P('solanum-lycopersicum'));
    expect(o.inRowMm).toEqual({ min: 500, max: 500 });
    expect(o.rowMm).toEqual({ min: 800, max: 800 });
    expect(o.pattern).toBe('triangular');
    const grid = resolveRules(planting({ method: 'grid', plantId: 'lactuca-sativa' }), P('lactuca-sativa'));
    expect(grid.inRowMm).toEqual({ min: 200, max: 300 });
  });
  it('handles plantings whose plant is missing, and tree hosts', () => {
    const doc = createProject('x');
    const tree = makeObject(doc, 'tree', { x: 0, y: 0, rotation: 0 }, { type: 'ellipse', rx: 2000, ry: 2000 });
    doc.objects[tree.id] = tree;
    doc.plantings.p = planting({ objectId: tree.id, plantId: 'malus-domestica', season: doc.settings.activeSeason });
    doc.plantings.q = planting({ id: 'q', objectId: tree.id, plantId: 'does-not-exist', season: doc.settings.activeSeason, createdAt: '2026-01-02T00:00:00Z' });
    const res = computeObjectPlantings(doc, tree, (id) => catalog.get(id));
    expect(res[0].quantity).toBe(1);
    expect(res[1].warnings.join(' ')).toMatch(/not found/);
  });
  it('ignores other seasons', () => {
    const doc = createProject('x');
    const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 1000, height: 1000 });
    doc.objects[bed.id] = bed;
    doc.plantings.p = planting({ objectId: bed.id, season: 1999 });
    expect(computeObjectPlantings(doc, bed, (id) => catalog.get(id))).toHaveLength(0);
    expect(computeObjectPlantings(doc, bed, (id) => catalog.get(id), 1999)).toHaveLength(1);
  });
});

describe('climate', () => {
  it('parses zones', () => {
    expect(finnishZoneNumber('iv')).toBe(4);
    expect(finnishZoneNumber('IX')).toBeNull();
    expect(finnishZoneNumber(null)).toBeNull();
    expect(usdaZoneNumber('5b')).toBe(5.5);
    expect(usdaZoneNumber('7')).toBe(7);
    expect(usdaZoneNumber('x')).toBeNull();
  });
  it('computes frost-free days, placeholders and hemisphere', () => {
    const loc = { ...defaultLocation(), lastFrost: '05-20', firstFrost: '09-25' };
    expect(frostFreeDays(loc)).toBe(128);
    expect(frostFreeDays(defaultLocation())).toBeNull();
    expect(frostDates(defaultLocation()).placeholder).toBe(true);
    expect(frostDates(loc).placeholder).toBe(false);
    expect(frostFreeDays({ ...loc, lastFrost: '10-01', firstFrost: '04-01' })).toBe(182);
    expect(isSouthernHemisphere({ ...loc, latitude: -33 })).toBe(true);
    expect(isSouthernHemisphere(loc)).toBe(false);
  });
  it('has sane Finnish presets (later frosts further north)', () => {
    const fi = CLIMATE_PRESETS.filter((p) => p.country === 'Finland');
    expect(fi).toHaveLength(8);
    for (let i = 1; i < fi.length; i++) {
      expect(fi[i].lastFrost >= fi[i - 1].lastFrost).toBe(true);
      expect(fi[i].firstFrost <= fi[i - 1].firstFrost).toBe(true);
    }
  });
  it('checks USDA hardiness and annuals', () => {
    const loc = { ...defaultLocation(), climateSystem: 'usda' as const, climateZone: '3' };
    const lav = { ...P('lavandula-angustifolia'), growing: { ...P('lavandula-angustifolia').growing, usdaZones: { min: 5, max: 9 } } };
    expect(checkHardiness(lav, loc).status).toBe('warning');
    expect(checkHardiness(lav, { ...loc, climateZone: '6a' }).status).toBe('ok');
    expect(checkHardiness(P('solanum-lycopersicum'), loc).status).toBe('ok');
    expect(checkHardiness(P('rheum-x-hybridum'), defaultLocation()).status).toBe('unknown');
  });
});

describe('suitability', () => {
  it('maps sun hours to levels and plant minimums', () => {
    expect(sunLevelFromHours(8)).toBe('full-sun');
    expect(sunLevelFromHours(4)).toBe('partial-shade');
    expect(sunLevelFromHours(2)).toBe('shade');
    expect(sunLevelFromHours(0.5)).toBe('deep-shade');
    expect(plantMinSunHours(P('hosta'))).toBe(1);
  });
  it('checks containers only for planters', () => {
    const doc = createProject('x');
    const planter = makeObject(doc, 'planter', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 500, height: 500 });
    const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 500, height: 500 });
    expect(checkContainer(P('solanum-lycopersicum'), planter)?.status).toBe('ok');
    expect(checkContainer(P('solanum-lycopersicum'), bed)).toBeNull();
    expect(checkContainer(P('malus-domestica'), planter)?.status).toBe('unknown');
    expect(checkSuitability(P('solanum-lycopersicum'), planter, doc.location)).toHaveLength(3);
  });
});

describe('companions', () => {
  it('matches ids, genera and families', () => {
    expect(matchesEndpoint('genus:allium', P('allium-cepa'))).toBe(true);
    expect(matchesEndpoint('family:Solanaceae', P('capsicum-annuum'))).toBe(true);
    expect(matchesEndpoint('allium-cepa', P('allium-sativum'))).toBe(false);
    expect(relationsForPlant(P('tagetes-patula'), catalog.companions).length).toBeGreaterThan(0);
  });
  it('does not relate a plant with itself and deduplicates', () => {
    expect(findCompanionRelations([P('allium-cepa'), P('allium-cepa')], catalog.companions)).toHaveLength(0);
    const r = findCompanionRelations([P('tagetes-patula'), P('solanum-lycopersicum'), P('capsicum-annuum')], catalog.companions);
    expect(r).toHaveLength(2);
  });
});

describe('plant seasons', () => {
  const a = anchorsFor({ ...defaultLocation(), lastFrost: '05-20', firstFrost: '09-25' }, 2026);
  it('summarises sow and harvest months', () => {
    const s = plantSeasons(P('solanum-lycopersicum'), a);
    expect(formatMonthSpan(s.sow)).toBe('Mar–Apr');
    expect(spanIncludesMonth(s.harvest, 8)).toBe(true);
    expect(spanIncludesMonth(s.harvest, 1)).toBe(false);
    expect(formatMonthSpan(null)).toBeNull();
    expect(formatMonthSpan(plantSeasons(P('ribes-nigrum'), a).harvest)).toBe('Jul–Aug');
  });
});
