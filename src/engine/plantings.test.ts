import { describe, expect, it } from 'vitest';
import { createProject, makeObject } from '../domain/projectFactory';
import type { Planting } from '../domain/project';
import { loadCoreCatalog } from '../test/fixtures';
import { computeObjectPlantings, resolveShares } from './plantings';

function planting(id: string, plantId: string, objectId: string, extra: Partial<Planting> = {}): Planting {
  return {
    id, plantId, objectId, season: 2026, variety: '', method: null, areaShare: null, spacing: {},
    quantityOverride: null, seedQuantityOverride: null, yieldOverride: null, dates: {}, status: 'planned', notes: '',
    createdAt: `2026-01-01T00:00:0${id.length}Z`, ...extra,
  };
}

describe('plantings', () => {
  const catalog = loadCoreCatalog();
  const lookup = (id: string) => catalog.get(id);

  it('splits unassigned shares evenly and scales over-allocated shares', () => {
    const a = planting('a', 'x', 'o', { areaShare: 0.5 });
    const b = planting('bb', 'x', 'o');
    const c = planting('ccc', 'x', 'o');
    const { shares } = resolveShares([a, b, c]);
    expect(shares.get('a')).toBe(0.5);
    expect(shares.get('bb')).toBe(0.25);
    const { shares: s2, warning } = resolveShares([planting('a', 'x', 'o', { areaShare: 0.8 }), planting('bb', 'x', 'o', { areaShare: 0.8 })]);
    expect(s2.get('a')).toBeCloseTo(0.5);
    expect(warning).toMatch(/160%/);
  });

  it('divides a bed between plantings and preserves user overrides', () => {
    const doc = createProject('Test', { now: new Date('2026-01-01') });
    const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 3000, height: 1200 });
    doc.objects[bed.id] = bed;
    doc.plantings.a = planting('a', 'daucus-carota-sativus', bed.id);
    doc.plantings.bb = planting('bb', 'allium-cepa', bed.id, { quantityOverride: 50 });
    const res = computeObjectPlantings(doc, bed, lookup, 2026);
    expect(res).toHaveLength(2);
    expect(res[0].share).toBeCloseTo(0.5);
    expect(res[0].capacity.areaMm2).toBeCloseTo(1.8e6, -3);
    expect(res[0].quantitySource).toBe('calculated');
    expect(res[0].quantity).toBeGreaterThan(0);
    expect(res[1].quantity).toBe(50);
    expect(res[1].quantitySource).toBe('override');
    expect(res[1].capacity.plants).not.toBe(50);
  });

  it('uses per-planting spacing overrides', () => {
    const doc = createProject('Test');
    const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 3000, height: 1200 });
    doc.objects[bed.id] = bed;
    doc.plantings.a = planting('a', 'daucus-carota-sativus', bed.id, { spacing: { inRowMm: 50, rowMm: 200 }, season: doc.settings.activeSeason });
    const [res] = computeObjectPlantings(doc, bed, lookup);
    expect(res.capacity.plants).toBe(360);
  });
});
