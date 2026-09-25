/**
 * Selection frame geometry and resize maths (pure).
 */
import {
  boundsCenter,
  boundsHeight,
  boundsOfPoints,
  boundsWidth,
  localToWorld,
  rotate,
  shapeOutline,
  type Bounds,
  type Shape,
  type Vec,
} from '../../domain/geometry';
import type { ProjectDoc } from '../../domain/project';
import { selectionBounds } from '../../editor/commands';

export interface Frame {
  center: Vec;
  width: number;
  height: number;
  rotation: number;
  single: boolean;
  /** Whether multi-selection contains objects that are not 90°-aligned (forces aspect lock). */
  forceAspect: boolean;
}

/** Local geometry bounds (without path stroke width) — what resize handles act on. */
export function geometryBounds(shape: Shape): Bounds {
  if (shape.type === 'ellipse') return { minX: -shape.rx, minY: -shape.ry, maxX: shape.rx, maxY: shape.ry };
  if (shape.type === 'polyline' || shape.type === 'polygon') return boundsOfPoints(shape.points);
  return boundsOfPoints(shapeOutline(shape, 8));
}

export function selectionFrame(doc: ProjectDoc, ids: readonly string[]): Frame | null {
  if (!ids.length) return null;
  if (ids.length === 1) {
    const o = doc.objects[ids[0]];
    if (!o) return null;
    const b = geometryBounds(o.shape);
    return {
      center: localToWorld(o.transform, boundsCenter(b)),
      width: boundsWidth(b),
      height: boundsHeight(b),
      rotation: o.transform.rotation,
      single: true,
      forceAspect: o.shape.type === 'text',
    };
  }
  const b = selectionBounds(doc, ids);
  if (!b) return null;
  const forceAspect = ids.some((id) => {
    const r = ((doc.objects[id]?.transform.rotation ?? 0) % 90 + 90) % 90;
    return r > 0.01 && r < 89.99;
  });
  return { center: boundsCenter(b), width: boundsWidth(b), height: boundsHeight(b), rotation: 0, single: false, forceAspect };
}

/** Handle directions: nw, n, ne, e, se, s, sw, w. */
export const HANDLE_DIRS: Vec[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
];

export const HANDLE_CURSORS = ['nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize'];

export function handleWorld(frame: Frame, i: number): Vec {
  const d = HANDLE_DIRS[i];
  const local = { x: (d.x * frame.width) / 2, y: (d.y * frame.height) / 2 };
  const r = rotate(local, frame.rotation);
  return { x: frame.center.x + r.x, y: frame.center.y + r.y };
}

export function frameCorners(frame: Frame): Vec[] {
  return [0, 2, 4, 6].map((i) => handleWorld(frame, i));
}

export interface ResizeResult {
  fx: number;
  fy: number;
  /** New frame centre in world space. */
  center: Vec;
  /** Fixed point (anchor) in world space. */
  anchor: Vec;
}

/**
 * Computes scale factors for dragging handle `i` of `frame` to world point
 * `p`. Shift keeps the aspect ratio; Alt resizes about the centre.
 */
export function resizeFromHandle(frame: Frame, i: number, p: Vec, keepAspect: boolean, fromCenter: boolean, minSize = 10): ResizeResult {
  const d = HANDLE_DIRS[i];
  const q = rotate({ x: p.x - frame.center.x, y: p.y - frame.center.y }, -frame.rotation);
  const hw = frame.width / 2;
  const hh = frame.height / 2;
  const anchorLocal = fromCenter ? { x: 0, y: 0 } : { x: -d.x * hw, y: -d.y * hh };
  let newW = frame.width;
  let newH = frame.height;
  if (d.x !== 0) newW = Math.max(minSize, fromCenter ? 2 * Math.abs(q.x) : d.x * (q.x - anchorLocal.x));
  if (d.y !== 0) newH = Math.max(minSize, fromCenter ? 2 * Math.abs(q.y) : d.y * (q.y - anchorLocal.y));
  let fx = frame.width > 0 ? newW / frame.width : 1;
  let fy = frame.height > 0 ? newH / frame.height : 1;
  if (keepAspect) {
    const f = d.x !== 0 && d.y !== 0 ? Math.max(fx, fy) : d.x !== 0 ? fx : fy;
    fx = f;
    fy = f;
    newW = frame.width * f;
    newH = frame.height * f;
  }
  if (frame.width === 0) fx = 1;
  if (frame.height === 0) fy = 1;
  // New centre: anchor + half of the new extent in the handle direction.
  const cx = fromCenter ? 0 : anchorLocal.x + (d.x !== 0 ? d.x * (newW / 2) : keepAspect ? 0 : 0);
  const cy = fromCenter ? 0 : anchorLocal.y + (d.y !== 0 ? d.y * (newH / 2) : 0);
  const centerLocal = { x: d.x !== 0 || fromCenter ? cx : 0, y: d.y !== 0 || fromCenter ? cy : 0 };
  const rc = rotate(centerLocal, frame.rotation);
  const ra = rotate(anchorLocal, frame.rotation);
  return {
    fx,
    fy,
    center: { x: frame.center.x + rc.x, y: frame.center.y + rc.y },
    anchor: { x: frame.center.x + ra.x, y: frame.center.y + ra.y },
  };
}
