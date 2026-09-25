/**
 * Property-based tests with a seeded PRNG: invariants that must hold for
 * any bed shape and spacing, checked over hundreds of random cases.
 */
import { describe, expect, it } from 'vitest';
import { calculatePlantCapacity } from './capacity';
import { calculateExpectedHarvest } from './harvest';
import {
  ellipsePoints,
  hitTestShape,
  pointInPolygon,
  polygonArea,
  rotate,
  shapeArea,
  splitPolygonByShares,
  worldBounds,
  worldOutline,
  distToPolyline,
  localToWorld,
  worldToLocal,
  type Vec,
} from '../domain/geometry';
import { prng } from '../test/prng';
import { loadCoreCatalog } from '../test/fixtures';

const CASES = 300;

function randomRect(r: ReturnType<typeof prng>): Vec[] {
  const w = r.range(200, 8000);
  const h = r.range(200, 8000);
  return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
}

/** Random star-shaped (possibly concave) polygon. */
function randomPolygon(r: ReturnType<typeof prng>): Vec[] {
  const n = r.int(3, 12);
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = r.range(500, 4000);
    pts.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
  }
  return pts;
}

describe('capacity invariants', () => {
  it('every plant position lies inside the region and respects the edge margin', () => {
    const r = prng(1);
    for (let i = 0; i < CASES; i++) {
      const region = r.next() < 0.5 ? randomRect(r) : randomPolygon(r);
      const s = r.range(50, 1200);
      const res = calculatePlantCapacity({ region, rules: { method: r.pick(['grid', 'spaced', 'rows'] as const), inRowMm: { min: s, max: s }, rowMm: { min: s * r.range(1, 3), max: s * r.range(3, 4) }, pattern: r.pick(['square', 'triangular'] as const) } });
      for (const p of res.positions) {
        expect(pointInPolygon(p, region)).toBe(true);
        expect(distToPolyline(p, region, true)).toBeGreaterThanOrEqual(s / 2 - 1e-3 - (res.rowMm ?? s) * 0); // margin = half the in-row spacing at least
      }
    }
  });
  it('never exceeds the physical density bound area / (inRow × row spacing) by more than edge effects', () => {
    const r = prng(2);
    for (let i = 0; i < CASES; i++) {
      const region = randomRect(r);
      const s = r.range(30, 800);
      const row = s * r.range(1, 4);
      const res = calculatePlantCapacity({ region, rules: { method: 'rows', inRowMm: { min: s, max: s }, rowMm: { min: row, max: row } } });
      const bound = polygonArea(region) / (s * row);
      expect(res.plants!).toBeLessThanOrEqual(Math.ceil(bound) + 1);
    }
  });
  it('wider spacing never gives more plants (monotonic), and the range brackets the estimate', () => {
    const r = prng(3);
    for (let i = 0; i < CASES; i++) {
      const region = r.next() < 0.5 ? randomRect(r) : randomPolygon(r);
      const a = r.range(50, 500);
      const b = a * r.range(1.01, 3);
      const rules = (s: number) => ({ method: 'grid' as const, inRowMm: { min: s, max: s }, rowMm: null });
      const dense = calculatePlantCapacity({ region, rules: rules(a) }).plants!;
      const sparse = calculatePlantCapacity({ region, rules: rules(b) }).plants!;
      expect(sparse).toBeLessThanOrEqual(dense);
      const ranged = calculatePlantCapacity({ region, rules: { method: 'grid', inRowMm: { min: a, max: b }, rowMm: null } });
      expect(ranged.plantsRange!.min).toBeLessThanOrEqual(ranged.plants!);
      expect(ranged.plantsRange!.max).toBeGreaterThanOrEqual(ranged.plants!);
    }
  });
  it('is invariant to translating the region', () => {
    const r = prng(4);
    for (let i = 0; i < 100; i++) {
      const region = randomPolygon(r);
      const dx = r.range(-1e6, 1e6);
      const dy = r.range(-1e6, 1e6);
      const moved = region.map((p) => ({ x: p.x + dx, y: p.y + dy }));
      const rules = { method: 'grid' as const, inRowMm: { min: 300, max: 300 }, rowMm: null };
      expect(calculatePlantCapacity({ region: moved, rules }).plants).toBe(calculatePlantCapacity({ region, rules }).plants);
    }
  });
  it('a larger rectangle never holds fewer plants', () => {
    const r = prng(5);
    for (let i = 0; i < CASES; i++) {
      const w = r.range(300, 5000);
      const h = r.range(300, 5000);
      const k = r.range(1, 2);
      const rect = (W: number, H: number) => [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
      const rules = { method: 'spaced' as const, inRowMm: { min: 250, max: 250 }, rowMm: { min: 400, max: 400 } };
      expect(calculatePlantCapacity({ region: rect(w * k, h * k), rules, rowAxis: 'x' }).plants!).toBeGreaterThanOrEqual(calculatePlantCapacity({ region: rect(w, h), rules, rowAxis: 'x' }).plants!);
    }
  });
});

describe('geometry invariants', () => {
  it('splitting by shares preserves total area and each share', () => {
    const r = prng(6);
    for (let i = 0; i < CASES; i++) {
      const poly = randomPolygon(r);
      const n = r.int(1, 5);
      const shares = Array.from({ length: n }, () => r.range(0.1, 1));
      const total = shares.reduce((s, v) => s + v, 0);
      const bands = splitPolygonByShares(poly, shares, r.pick(['x', 'y'] as const));
      const area = polygonArea(poly);
      expect(bands.reduce((s, b) => s + polygonArea(b), 0)).toBeCloseTo(area, -1);
      if (n > 1) bands.forEach((b, k) => expect(polygonArea(b) / area).toBeCloseTo(shares[k] / total, 2));
    }
  });
  it('local↔world transforms are inverse and preserve distances', () => {
    const r = prng(7);
    for (let i = 0; i < CASES; i++) {
      const t = { x: r.range(-1e5, 1e5), y: r.range(-1e5, 1e5), rotation: r.range(-720, 720) };
      const p = { x: r.range(-1e4, 1e4), y: r.range(-1e4, 1e4) };
      const back = worldToLocal(t, localToWorld(t, p));
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
      const q = rotate(p, t.rotation);
      expect(Math.hypot(q.x, q.y)).toBeCloseTo(Math.hypot(p.x, p.y), 6);
    }
  });
  it('world bounds contain the whole outline for any rotation', () => {
    const r = prng(8);
    for (let i = 0; i < CASES; i++) {
      const shape = r.next() < 0.5 ? { type: 'rect' as const, width: r.range(10, 5000), height: r.range(10, 5000) } : { type: 'ellipse' as const, rx: r.range(10, 3000), ry: r.range(10, 3000) };
      const t = { x: r.range(-1e4, 1e4), y: r.range(-1e4, 1e4), rotation: r.range(0, 360) };
      const b = worldBounds(t, shape);
      for (const p of worldOutline(t, shape, 64)) {
        expect(p.x).toBeGreaterThanOrEqual(b.minX - 1e-6);
        expect(p.x).toBeLessThanOrEqual(b.maxX + 1e-6);
        expect(p.y).toBeGreaterThanOrEqual(b.minY - 1e-6);
        expect(p.y).toBeLessThanOrEqual(b.maxY + 1e-6);
      }
      // The centre always hit-tests positive.
      expect(hitTestShape(t, shape, { x: t.x, y: t.y }, 0)).toBe(true);
    }
  });
  it('sampled ellipse area converges on the exact area', () => {
    const r = prng(9);
    for (let i = 0; i < 50; i++) {
      const rx = r.range(10, 5000);
      const ry = r.range(10, 5000);
      expect(polygonArea(ellipsePoints(rx, ry, 720)) / shapeArea({ type: 'ellipse', rx, ry })).toBeCloseTo(1, 3);
    }
  });
});

describe('harvest invariants', () => {
  const catalog = loadCoreCatalog();
  it('totals scale linearly with quantity and never invert min/max', () => {
    const r = prng(10);
    const plants = catalog.all().filter((p) => p.yield?.perPlantKg);
    for (let i = 0; i < CASES; i++) {
      const plant = r.pick(plants);
      const q = r.int(0, 500);
      const e = calculateExpectedHarvest({ plant, quantity: q, areaM2: r.range(0.1, 50) });
      expect(e.total!.min).toBeLessThanOrEqual(e.total!.max);
      expect(e.total!.min).toBeCloseTo(plant.yield!.perPlantKg!.min * q, 6);
    }
  });
});
