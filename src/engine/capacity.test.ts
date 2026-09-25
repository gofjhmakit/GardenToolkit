import { describe, expect, it } from 'vitest';
import { shapeOutline, type Vec } from '../domain/geometry';
import { calculatePlantCapacity, type PlantingRules } from './capacity';

const rectRegion = (w: number, h: number): Vec[] => shapeOutline({ type: 'rect', width: w, height: h });
const exact = (v: number) => ({ min: v, max: v });

describe('calculatePlantCapacity', () => {
  it('reproduces the carrot example: 3 m × 1.2 m, 5 cm in-row, 20 cm rows = 360 plants', () => {
    const rules: PlantingRules = { method: 'rows', inRowMm: exact(50), rowMm: exact(200) };
    const r = calculatePlantCapacity({ region: rectRegion(3000, 1200), rules });
    expect(r.rowAxis).toBe('x');
    expect(r.rows).toBe(6);
    expect(r.plantsPerRow).toBe(60);
    expect(r.plants).toBe(360);
    expect(r.explanation.join(' ')).toMatch(/6 rows/);
  });

  it('gives a range across the spacing range', () => {
    const rules: PlantingRules = { method: 'rows', inRowMm: { min: 30, max: 80 }, rowMm: { min: 150, max: 300 } };
    const r = calculatePlantCapacity({ region: rectRegion(3000, 1200), rules });
    expect(r.plantsRange!.min).toBeLessThan(r.plants!);
    expect(r.plantsRange!.max).toBeGreaterThan(r.plants!);
  });

  it('is not simply area / spacing²', () => {
    // Narrow 30 cm bed, 40 cm spacing: naive area division says 1.5 plants per metre... the lattice says only
    // one row fits because of the edge margin.
    const rules: PlantingRules = { method: 'spaced', inRowMm: exact(400), rowMm: exact(400) };
    const r = calculatePlantCapacity({ region: rectRegion(4000, 300), rules });
    expect(r.rows).toBe(0);
    expect(r.plants).toBe(0);
    expect(r.warnings.join(' ')).toMatch(/too small/);
    const wide = calculatePlantCapacity({ region: rectRegion(4000, 400), rules });
    expect(wide.rows).toBe(1);
    expect(wide.plants).toBe(10);
  });

  it('packs more plants with a triangular grid than a square one', () => {
    const base: PlantingRules = { method: 'grid', inRowMm: exact(250), rowMm: null };
    const sq = calculatePlantCapacity({ region: rectRegion(2400, 1200), rules: { ...base, pattern: 'square' } });
    const tri = calculatePlantCapacity({ region: rectRegion(2400, 1200), rules: { ...base, pattern: 'triangular' } });
    expect(sq.plants).toBe(9 * 4);
    expect(tri.plants!).toBeGreaterThan(sq.plants!);
  });

  it('respects curved edges of circular beds', () => {
    const rules: PlantingRules = { method: 'grid', inRowMm: exact(300), rowMm: null };
    const circle = calculatePlantCapacity({ region: shapeOutline({ type: 'ellipse', rx: 1000, ry: 1000 }, 96), rules });
    const square = calculatePlantCapacity({ region: rectRegion(2000, 2000), rules });
    expect(circle.plants!).toBeLessThan(square.plants!);
    expect(circle.plants!).toBeGreaterThan(0);
    // Every position keeps the edge margin (half spacing) inside the circle.
    for (const p of circle.positions) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(1000 - 150 + 1);
  });

  it('runs rows along the longer side by default and honours an explicit axis', () => {
    const rules: PlantingRules = { method: 'rows', inRowMm: exact(100), rowMm: exact(300) };
    const tall = calculatePlantCapacity({ region: rectRegion(1200, 3000), rules });
    expect(tall.rowAxis).toBe('y');
    const forced = calculatePlantCapacity({ region: rectRegion(1200, 3000), rules, rowAxis: 'x' });
    expect(forced.rowAxis).toBe('x');
    expect(forced.rows).toBeGreaterThan(tall.rows!);
  });

  it('reports missing spacing instead of inventing a number', () => {
    const r = calculatePlantCapacity({ region: rectRegion(1000, 1000), rules: { method: 'spaced', inRowMm: null, rowMm: null } });
    expect(r.plants).toBeNull();
    expect(r.warnings[0]).toMatch(/No spacing data/);
  });

  it('estimates seed for row sowing from seed spacing and seeds per gram', () => {
    const rules: PlantingRules = {
      method: 'rows',
      inRowMm: exact(50),
      rowMm: exact(200),
      seedMm: { min: 10, max: 20 },
      seedsPerGram: { min: 600, max: 1000 },
    };
    const r = calculatePlantCapacity({ region: rectRegion(3000, 1200), rules });
    // 6 rows × 2.95 m of sowable row = 17.7 m → 885–1770 seeds
    expect(r.seeds).toEqual({ min: 885, max: 1770 });
    expect(r.seedGrams!.min).toBeCloseTo(885 / 1000);
  });

  it('handles broadcast sowing by seed rate', () => {
    const r = calculatePlantCapacity({
      region: rectRegion(2000, 2000),
      rules: { method: 'broadcast', inRowMm: null, rowMm: null, seedRateGPerM2: { min: 1, max: 1.5 } },
    });
    expect(r.plants).toBeNull();
    expect(r.seedGrams).toEqual({ min: 4, max: 6 });
  });

  it('treats tree/shrub symbols as one plant and warns when the footprint is too small', () => {
    const r = calculatePlantCapacity({
      region: shapeOutline({ type: 'ellipse', rx: 500, ry: 500 }),
      rules: { method: 'individual', inRowMm: exact(3000), rowMm: null },
      singlePlantHost: true,
    });
    expect(r.plants).toBe(1);
    expect(r.warnings.length).toBe(1);
  });
});
