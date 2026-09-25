import { describe, expect, it } from 'vitest';
import { createProject, makeObject } from '../domain/projectFactory';
import { addObjects } from './commands';
import { buildSnapTargets, snapAngle, snapMove, snapPoint, snapToGrid } from './snapping';

function doc2() {
  const doc = createProject('snap');
  const a = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 2000, height: 1000 });
  addObjects(doc, [a]);
  const hidden = makeObject(doc, 'bed', { x: 50000, y: 0, rotation: 0 }, { type: 'rect', width: 2000, height: 1000 }, { hidden: true });
  addObjects(doc, [hidden]);
  return { doc, a, hidden };
}

describe('snapping', () => {
  it('rounds to the grid', () => {
    expect(snapToGrid(1234, 500)).toBe(1000);
    expect(snapToGrid(1300, 500)).toBe(1500);
    expect(snapToGrid(-260, 500)).toBe(-500);
  });
  it('collects edges, centres and vertices of visible objects only', () => {
    const { doc, a, hidden } = doc2();
    const t = buildSnapTargets(doc, new Set(), null);
    expect(t.xs.map((x) => x.value)).toEqual([-1000, 0, 1000]);
    expect(t.ys.map((x) => x.value)).toEqual([-500, 0, 500]);
    expect(t.points).toContainEqual({ x: 1000, y: 500 });
    expect(t.points.length).toBe(5);
    void hidden;
    expect(buildSnapTargets(doc, new Set([a.id]), null).xs).toHaveLength(0);
  });
  it('ignores objects far outside the view', () => {
    const { doc } = doc2();
    const t = buildSnapTargets(doc, new Set(), { minX: 100000, minY: 100000, maxX: 101000, maxY: 101000 });
    expect(t.xs).toHaveLength(0);
  });
  it('snaps a moving selection to object edges with a guide, else to the grid', () => {
    const { doc } = doc2();
    const t = buildSnapTargets(doc, new Set(), null);
    const bounds = { minX: 3000, minY: 3000, maxX: 4000, maxY: 3500 };
    // Moving left by 1995 puts minX at 1005 ≈ other object's maxX 1000.
    const r = snapMove(bounds, -1995, 0, t, { grid: 100, objects: true, tolerance: 20 });
    expect(r.dx).toBe(-2000);
    expect(r.guides.some((g) => g.axis === 'x' && g.value === 1000)).toBe(true);
    expect(r.dy).toBe(0); // y snapped to the grid (3000 is on the 100 mm grid)
    const g = snapMove(bounds, 37, 42, t, { grid: 100, objects: false, tolerance: 20 });
    expect(g).toMatchObject({ dx: 0, dy: 0 });
    const none = snapMove(bounds, 37, 42, t, { grid: null, objects: false, tolerance: 20 });
    expect(none).toMatchObject({ dx: 37, dy: 42 });
  });
  it('snaps points to vertices first, then alignment, then grid', () => {
    const { doc } = doc2();
    const t = buildSnapTargets(doc, new Set(), null);
    expect(snapPoint({ x: 1004, y: 497 }, t, { grid: 100, objects: true, tolerance: 10 })).toMatchObject({ point: { x: 1000, y: 500 }, kind: 'vertex' });
    const al = snapPoint({ x: 1003, y: 2240 }, t, { grid: 100, objects: true, tolerance: 10 });
    expect(al.kind).toBe('align');
    expect(al.point).toEqual({ x: 1000, y: 2200 });
    expect(snapPoint({ x: 3333, y: 2240 }, t, { grid: 100, objects: true, tolerance: 10 })).toMatchObject({ point: { x: 3300, y: 2200 }, kind: 'grid' });
    expect(snapPoint({ x: 3333, y: 2240 }, t, { grid: null, objects: false, tolerance: 10 }).kind).toBe('none');
  });
  it('snaps angles to 15°', () => {
    expect(snapAngle(7)).toBe(0);
    expect(snapAngle(8)).toBe(15);
    expect(snapAngle(-44)).toBe(-45);
    expect(snapAngle(91, 45)).toBe(90);
  });
});
