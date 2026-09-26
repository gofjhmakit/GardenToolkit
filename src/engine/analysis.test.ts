import { describe, expect, it } from 'vitest';
import { createProject, makeObject } from '../domain/projectFactory';
import type { Planting } from '../domain/project';
import { loadCoreCatalog } from '../test/fixtures';
import { analyzeRotation } from './rotation';
import { findCompanionRelations } from './companions';
import { checkSun } from './suitability';
import { checkHardiness } from './climate';

const catalog = loadCoreCatalog();
const lookup = (id: string) => catalog.get(id);

const pl = (id: string, plantId: string, objectId: string, season: number): Planting => ({
  id, plantId, objectId, season, variety: '', method: null, areaShare: null, spacing: {}, quantityOverride: null,
  seedQuantityOverride: null, yieldOverride: null, dates: {}, status: 'planned', notes: '', createdAt: '2026-01-01T00:00:00Z',
});

describe('crop rotation', () => {
  it('flags repeated crop groups within the guidance interval and suggests the next group', () => {
    const doc = createProject('Rot');
    const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 1000, height: 1000 });
    doc.objects[bed.id] = bed;
    doc.plantings.a = pl('a', 'solanum-tuberosum', bed.id, 2025);
    doc.plantings.b = pl('b', 'solanum-lycopersicum', bed.id, 2026);
    const [r] = analyzeRotation(doc, lookup, catalog.rotationRules);
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0].group).toBe('solanaceae');
    expect(r.suggestion).toMatchObject({ season: 2027, group: 'legumes' });
  });
  it('includes manually recorded history', () => {
    const doc = createProject('Rot');
    const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 1000, height: 1000 });
    doc.objects[bed.id] = bed;
    doc.rotationHistory.push({ id: 'h', objectId: bed.id, season: 2024, group: 'brassicas', crop: 'Cabbage' });
    doc.plantings.a = pl('a', 'brassica-oleracea-sabellica', bed.id, 2026);
    const [r] = analyzeRotation(doc, lookup, catalog.rotationRules);
    expect(r.issues).toHaveLength(1);
    expect(r.entries.map((e) => e.season)).toEqual([2024, 2026]);
  });
});

describe('companion planting', () => {
  it('finds documented and family-level relations with their evidence level', () => {
    const found = findCompanionRelations(
      [catalog.get('solanum-tuberosum')!, catalog.get('solanum-lycopersicum')!, catalog.get('tagetes-patula')!],
      catalog.companions,
    );
    const blight = found.find((f) => f.relation.kind === 'antagonistic');
    expect(blight?.relation.evidence).toBe('documented');
    expect(found.some((f) => f.relation.a === 'tagetes-patula')).toBe(true);
  });
  it('labels folklore as traditional', () => {
    const found = findCompanionRelations([catalog.get('allium-cepa')!, catalog.get('pisum-sativum')!], catalog.companions);
    expect(found[0].relation.evidence).toBe('traditional');
  });
});

describe('suitability', () => {
  it('warns (not blocks) when sun is insufficient', () => {
    const doc = createProject('Sun');
    const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 1000, height: 1000 }, { props: { sunLevel: 'shade' } });
    expect(checkSun(catalog.get('solanum-lycopersicum')!, bed).status).toBe('warning');
    expect(checkSun(catalog.get('hosta')!, bed).status).toBe('ok');
    const bed2 = { ...bed, props: { sunHours: 7 } };
    expect(checkSun(catalog.get('solanum-lycopersicum')!, bed2).status).toBe('ok');
    const unknown = { ...bed, props: {} };
    expect(checkSun(catalog.get('solanum-lycopersicum')!, unknown).status).toBe('unknown');
  });
  it('checks Finnish-zone hardiness when data exists', () => {
    const rhubarb = catalog.get('rheum-x-hybridum')!;
    const loc = createProject('x').location;
    expect(checkHardiness(rhubarb, { ...loc, climateSystem: 'finnish-zone', climateZone: 'VIII' }).status).toBe('ok');
    // Apple is rated to zone V: zone VI is beyond it, zone IV is fine.
    expect(checkHardiness(catalog.get('malus-domestica')!, { ...loc, climateSystem: 'finnish-zone', climateZone: 'VI' }).status).toBe('warning');
    expect(checkHardiness(catalog.get('malus-domestica')!, { ...loc, climateSystem: 'finnish-zone', climateZone: 'IV' }).status).toBe('ok');
    // Tender perennials have no zone rating and say so.
    expect(checkHardiness(catalog.get('laurus-nobilis')!, { ...loc, climateSystem: 'finnish-zone', climateZone: 'I' }).status).toBe('unknown');
  });
  it('has winter-hardiness data for every hardy perennial', () => {
    const missing = catalog
      .all()
      .filter((p) => p.lifecycle === 'perennial' && p.growing.frostTolerance === 'hardy' && (!p.growing.finnishZones || !p.growing.usdaZones))
      .map((p) => p.id);
    expect(missing).toEqual([]);
  });
});
