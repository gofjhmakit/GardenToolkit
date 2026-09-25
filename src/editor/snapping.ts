/**
 * Snapping: grid, object edges/centres/vertices and alignment guides.
 * Pure functions; the tolerance is given in world millimetres (the canvas
 * converts a pixel tolerance using the current zoom so snapping feels the
 * same at every zoom level).
 */
import {
  boundsIntersect,
  expandBounds,
  localToWorld,
  shapeOutline,
  type Bounds,
  type Vec,
} from '../domain/geometry';
import type { ProjectDoc } from '../domain/project';
import { isObjectVisible } from '../domain/projectFactory';
import { objectBounds } from './commands';

export interface SnapGuide {
  axis: 'x' | 'y';
  value: number;
  from: number;
  to: number;
}

export interface SnapTargets {
  xs: { value: number; span: [number, number] }[];
  ys: { value: number; span: [number, number] }[];
  points: Vec[];
}

export interface SnapOptions {
  grid: number | null;
  objects: boolean;
  tolerance: number;
}

/** Collects snap targets from visible objects near the viewport. */
export function buildSnapTargets(doc: ProjectDoc, exclude: ReadonlySet<string>, view: Bounds | null): SnapTargets {
  const t: SnapTargets = { xs: [], ys: [], points: [] };
  const area = view ? expandBounds(view, Math.max(view.maxX - view.minX, view.maxY - view.minY) * 0.25) : null;
  for (const o of Object.values(doc.objects)) {
    if (exclude.has(o.id) || !isObjectVisible(doc, o)) continue;
    const b = objectBounds(o);
    if (area && !boundsIntersect(area, b)) continue;
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    for (const x of [b.minX, cx, b.maxX]) t.xs.push({ value: x, span: [b.minY, b.maxY] });
    for (const y of [b.minY, cy, b.maxY]) t.ys.push({ value: y, span: [b.minX, b.maxX] });
    t.points.push({ x: cx, y: cy });
    if (o.shape.type !== 'ellipse' && o.shape.type !== 'text') {
      const outline = o.shape.type === 'dimension' ? [o.shape.a, o.shape.b] : shapeOutline(o.shape);
      if (outline.length <= 200) for (const p of outline) t.points.push(localToWorld(o.transform, p));
    }
  }
  return t;
}

function nearest(
  values: number[],
  targets: SnapTargets['xs'],
  tol: number,
): { delta: number; target: SnapTargets['xs'][number]; source: number } | null {
  let best: { delta: number; target: SnapTargets['xs'][number]; source: number } | null = null;
  for (const v of values) {
    for (const t of targets) {
      const d = t.value - v;
      if (Math.abs(d) <= tol && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, target: t, source: v };
    }
  }
  return best;
}

export function snapToGrid(v: number, grid: number): number {
  return Math.round(v / grid) * grid;
}

/**
 * Snaps a moving selection. `bounds` is the selection's bounds *before* the
 * move; returns the adjusted delta and guides to draw.
 */
export function snapMove(
  bounds: Bounds,
  dx: number,
  dy: number,
  targets: SnapTargets,
  opts: SnapOptions,
): { dx: number; dy: number; guides: SnapGuide[] } {
  const guides: SnapGuide[] = [];
  const moved = { minX: bounds.minX + dx, maxX: bounds.maxX + dx, minY: bounds.minY + dy, maxY: bounds.maxY + dy };
  const cx = (moved.minX + moved.maxX) / 2;
  const cy = (moved.minY + moved.maxY) / 2;
  let sx = dx;
  let sy = dy;
  let snappedX = false;
  let snappedY = false;
  if (opts.objects) {
    const nx = nearest([moved.minX, cx, moved.maxX], targets.xs, opts.tolerance);
    if (nx) {
      sx += nx.delta;
      snappedX = true;
      guides.push({ axis: 'x', value: nx.target.value, from: Math.min(nx.target.span[0], moved.minY + (sy - dy)), to: Math.max(nx.target.span[1], moved.maxY + (sy - dy)) });
    }
    const ny = nearest([moved.minY, cy, moved.maxY], targets.ys, opts.tolerance);
    if (ny) {
      sy += ny.delta;
      snappedY = true;
      guides.push({ axis: 'y', value: ny.target.value, from: Math.min(ny.target.span[0], moved.minX + (sx - dx)), to: Math.max(ny.target.span[1], moved.maxX + (sx - dx)) });
    }
  }
  if (opts.grid) {
    if (!snappedX) sx = snapToGrid(bounds.minX + dx, opts.grid) - bounds.minX;
    if (!snappedY) sy = snapToGrid(bounds.minY + dy, opts.grid) - bounds.minY;
  }
  return { dx: sx, dy: sy, guides };
}

/** Snaps a single point (drawing, vertex editing, calibration). */
export function snapPoint(p: Vec, targets: SnapTargets, opts: SnapOptions): { point: Vec; guides: SnapGuide[]; kind: 'vertex' | 'align' | 'grid' | 'none' } {
  if (opts.objects) {
    let best: Vec | null = null;
    let bestD = opts.tolerance;
    for (const q of targets.points) {
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d <= bestD) {
        best = q;
        bestD = d;
      }
    }
    if (best) return { point: { ...best }, guides: [], kind: 'vertex' };
    const nx = nearest([p.x], targets.xs, opts.tolerance);
    const ny = nearest([p.y], targets.ys, opts.tolerance);
    if (nx || ny) {
      const guides: SnapGuide[] = [];
      const x = nx ? nx.target.value : opts.grid ? snapToGrid(p.x, opts.grid) : p.x;
      const y = ny ? ny.target.value : opts.grid ? snapToGrid(p.y, opts.grid) : p.y;
      if (nx) guides.push({ axis: 'x', value: x, from: Math.min(nx.target.span[0], y), to: Math.max(nx.target.span[1], y) });
      if (ny) guides.push({ axis: 'y', value: y, from: Math.min(ny.target.span[0], x), to: Math.max(ny.target.span[1], x) });
      return { point: { x, y }, guides, kind: 'align' };
    }
  }
  if (opts.grid) return { point: { x: snapToGrid(p.x, opts.grid), y: snapToGrid(p.y, opts.grid) }, guides: [], kind: 'grid' };
  return { point: p, guides: [], kind: 'none' };
}

/** Snaps an angle to 15° increments (used with Shift while rotating/drawing lines). */
export function snapAngle(deg: number, step = 15): number {
  return Math.round(deg / step) * step;
}
