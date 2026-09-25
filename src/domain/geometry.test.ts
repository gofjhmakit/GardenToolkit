import { describe, expect, it } from 'vitest';
import {
  clipPolygonAxis,
  hitTestShape,
  outlineIntersectsBounds,
  pointInPolygon,
  polygonArea,
  recenterShape,
  scaleShape,
  shapeArea,
  shapePerimeter,
  simplifyPath,
  splitPolygonByShares,
  worldBounds,
  type Shape,
} from './geometry';

const rect: Shape = { type: 'rect', width: 3000, height: 1200 };

describe('geometry', () => {
  it('computes areas exactly for closed-form shapes', () => {
    expect(shapeArea(rect)).toBe(3.6e6);
    expect(shapeArea({ type: 'ellipse', rx: 1000, ry: 1000 })).toBeCloseTo(Math.PI * 1e6);
    expect(shapeArea({ type: 'polygon', points: [{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 0, y: 2000 }] })).toBe(2e6);
    expect(shapeArea({ type: 'polyline', points: [{ x: 0, y: 0 }, { x: 5000, y: 0 }], width: 1000 })).toBe(5e6);
  });
  it('computes perimeters', () => {
    expect(shapePerimeter(rect)).toBe(8400);
    expect(shapePerimeter({ type: 'ellipse', rx: 1000, ry: 1000 })).toBeCloseTo(2 * Math.PI * 1000, 3);
  });
  it('hit-tests rotated shapes in world space', () => {
    const t = { x: 10000, y: 5000, rotation: 90 };
    // Rotated 90°: the 3 m side is now vertical.
    expect(hitTestShape(t, rect, { x: 10000, y: 6400 }, 0)).toBe(true);
    expect(hitTestShape(t, rect, { x: 11400, y: 5000 }, 0)).toBe(false);
  });
  it('computes rotated bounds', () => {
    const b = worldBounds({ x: 0, y: 0, rotation: 90 }, rect);
    expect(b.maxX - b.minX).toBeCloseTo(1200);
    expect(b.maxY - b.minY).toBeCloseTo(3000);
  });
  it('point in polygon', () => {
    const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(pointInPolygon({ x: 5, y: 5 }, sq)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, sq)).toBe(false);
  });
  it('clips and splits polygons by area share', () => {
    const sq = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }];
    expect(polygonArea(clipPolygonAxis(sq, 'x', 25, 'below'))).toBeCloseTo(1250);
    const bands = splitPolygonByShares(sq, [1, 3], 'x');
    expect(polygonArea(bands[0])).toBeCloseTo(1250, 3);
    expect(polygonArea(bands[1])).toBeCloseTo(3750, 3);
    // Concave/triangular shapes still split by area, not by width.
    const tri = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }];
    const [a, b] = splitPolygonByShares(tri, [1, 1], 'x');
    expect(polygonArea(a)).toBeCloseTo(polygonArea(b), 2);
  });
  it('detects outline/rectangle intersections for marquee selection', () => {
    const sq = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(outlineIntersectsBounds(sq, true, { minX: 5, minY: 5, maxX: 20, maxY: 20 })).toBe(true);
    expect(outlineIntersectsBounds(sq, true, { minX: 2, minY: 2, maxX: 3, maxY: 3 })).toBe(true); // inside
    expect(outlineIntersectsBounds(sq, true, { minX: 20, minY: 20, maxX: 30, maxY: 30 })).toBe(false);
  });
  it('scales and recentres shapes', () => {
    expect(scaleShape(rect, 2, 0.5)).toEqual({ type: 'rect', width: 6000, height: 600 });
    const poly: Shape = { type: 'polygon', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] };
    const { shape, offset } = recenterShape(poly);
    expect(offset).toEqual({ x: 5, y: 5 });
    expect(shape.type === 'polygon' && shape.points[0]).toEqual({ x: -5, y: -5 });
  });
  it('simplifies freehand paths', () => {
    const pts = Array.from({ length: 100 }, (_, i) => ({ x: i, y: i % 2 === 0 ? 0 : 0.1 }));
    expect(simplifyPath(pts, 1).length).toBe(2);
  });
});
