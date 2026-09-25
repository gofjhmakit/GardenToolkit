import { describe, expect, it } from 'vitest';
import { createProject, makeObject } from '../../domain/projectFactory';
import { addObjects } from '../../editor/commands';
import { geometryBounds, handleWorld, resizeFromHandle, selectionFrame } from './frame';

describe('selection frame & resize maths', () => {
  const doc = createProject('f');
  const a = makeObject(doc, 'bed', { x: 1000, y: 1000, rotation: 90 }, { type: 'rect', width: 3000, height: 1000 });
  const b = makeObject(doc, 'bed', { x: 5000, y: 1000, rotation: 30 }, { type: 'rect', width: 1000, height: 1000 });
  addObjects(doc, [a, b]);

  it('uses the object frame for single selections (rotated)', () => {
    const f = selectionFrame(doc, [a.id])!;
    expect(f).toMatchObject({ width: 3000, height: 1000, rotation: 90, single: true });
    const east = handleWorld(f, 3); // local +x edge → world +y after 90°
    expect(east.x).toBeCloseTo(1000);
    expect(east.y).toBeCloseTo(2500);
  });
  it('uses axis-aligned bounds for multi-selection and forces aspect for odd rotations', () => {
    const f = selectionFrame(doc, [a.id, b.id])!;
    expect(f.rotation).toBe(0);
    expect(f.single).toBe(false);
    expect(f.forceAspect).toBe(true);
    expect(selectionFrame(doc, [])).toBeNull();
  });
  it('resizes from a corner keeping the opposite corner fixed', () => {
    const f = { center: { x: 0, y: 0 }, width: 2000, height: 1000, rotation: 0, single: true, forceAspect: false };
    const r = resizeFromHandle(f, 4, { x: 2000, y: 1500 }, false, false); // SE handle dragged
    expect(r.fx).toBeCloseTo(1.5);
    expect(r.fy).toBeCloseTo(2);
    expect(r.anchor).toEqual({ x: -1000, y: -500 });
    expect(r.center.x).toBeCloseTo(500);
    expect(r.center.y).toBeCloseTo(500);
  });
  it('keeps aspect with Shift and resizes about the centre with Alt', () => {
    const f = { center: { x: 0, y: 0 }, width: 2000, height: 1000, rotation: 0, single: true, forceAspect: false };
    const keep = resizeFromHandle(f, 4, { x: 3000, y: 600 }, true, false);
    expect(keep.fx).toBeCloseTo(keep.fy);
    const alt = resizeFromHandle(f, 3, { x: 1500, y: 0 }, false, true);
    expect(alt.fx).toBeCloseTo(1.5);
    expect(alt.center).toEqual({ x: 0, y: 0 });
  });
  it('edge handles only scale their axis and never go below the minimum size', () => {
    const f = { center: { x: 0, y: 0 }, width: 2000, height: 1000, rotation: 0, single: true, forceAspect: false };
    const r = resizeFromHandle(f, 1, { x: 0, y: -900 }, false, false); // N handle
    expect(r.fx).toBe(1);
    expect(r.fy).toBeCloseTo(1.4);
    const tiny = resizeFromHandle(f, 3, { x: -5000, y: 0 }, false, false); // E dragged past W
    expect(tiny.fx * 2000).toBeCloseTo(10);
  });
  it('computes geometry bounds without path stroke width', () => {
    expect(geometryBounds({ type: 'polyline', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], width: 1000 })).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 0 });
    expect(geometryBounds({ type: 'ellipse', rx: 5, ry: 3 })).toEqual({ minX: -5, minY: -3, maxX: 5, maxY: 3 });
  });
});
