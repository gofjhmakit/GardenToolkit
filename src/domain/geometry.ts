/**
 * Pure 2D geometry used by the editor, renderer and calculation engine.
 * All coordinates are millimetres (see units.ts).
 */

export interface Vec {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Placement of an object: position of its local origin and clockwise rotation in degrees. */
export interface Transform {
  x: number;
  y: number;
  rotation: number;
}

export type Shape =
  | { type: 'rect'; width: number; height: number; cornerRadius?: number }
  | { type: 'ellipse'; rx: number; ry: number }
  | { type: 'polygon'; points: Vec[] }
  | { type: 'polyline'; points: Vec[]; width: number }
  | { type: 'text'; text: string; fontSize: number }
  | { type: 'dimension'; a: Vec; b: Vec; offset: number };

export type ShapeType = Shape['type'];

export const vec = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
export const cross = (a: Vec, b: Vec): number => a.x * b.y - a.y * b.x;
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

export const DEG = Math.PI / 180;

export function normalizeAngle(deg: number): number {
  let a = deg % 360;
  if (a < 0) a += 360;
  return Math.abs(a - 360) < 1e-9 ? 0 : a;
}

export function rotate(v: Vec, deg: number): Vec {
  if (deg === 0) return v;
  const r = deg * DEG;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

export function rotateAround(v: Vec, center: Vec, deg: number): Vec {
  return add(center, rotate(sub(v, center), deg));
}

export function localToWorld(t: Transform, p: Vec): Vec {
  const r = rotate(p, t.rotation);
  return { x: r.x + t.x, y: r.y + t.y };
}

export function worldToLocal(t: Transform, p: Vec): Vec {
  return rotate({ x: p.x - t.x, y: p.y - t.y }, -t.rotation);
}

export function emptyBounds(): Bounds {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}

export function boundsOfPoints(points: readonly Vec[]): Bounds {
  const b = emptyBounds();
  for (const p of points) {
    if (p.x < b.minX) b.minX = p.x;
    if (p.y < b.minY) b.minY = p.y;
    if (p.x > b.maxX) b.maxX = p.x;
    if (p.y > b.maxY) b.maxY = p.y;
  }
  return b;
}

export function unionBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

export function isEmptyBounds(b: Bounds): boolean {
  return !(b.maxX >= b.minX && b.maxY >= b.minY);
}

export function boundsWidth(b: Bounds): number {
  return b.maxX - b.minX;
}

export function boundsHeight(b: Bounds): number {
  return b.maxY - b.minY;
}

export function boundsCenter(b: Bounds): Vec {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

export function boundsFromCorners(a: Vec, b: Vec): Bounds {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function boundsContains(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minY >= outer.minY && inner.maxY <= outer.maxY
  );
}

export function boundsCorners(b: Bounds): Vec[] {
  return [
    { x: b.minX, y: b.minY },
    { x: b.maxX, y: b.minY },
    { x: b.maxX, y: b.maxY },
    { x: b.minX, y: b.maxY },
  ];
}

export function expandBounds(b: Bounds, by: number): Bounds {
  return { minX: b.minX - by, minY: b.minY - by, maxX: b.maxX + by, maxY: b.maxY + by };
}

// ---------------------------------------------------------------------------
// Polygons
// ---------------------------------------------------------------------------

/** Signed shoelace area (positive for clockwise in y-down space). */
export function signedPolygonArea(points: readonly Vec[]): number {
  let sum = 0;
  for (let i = 0, n = points.length; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export function polygonArea(points: readonly Vec[]): number {
  return Math.abs(signedPolygonArea(points));
}

export function polylineLength(points: readonly Vec[], closed = false): number {
  let total = 0;
  const n = points.length;
  for (let i = 0; i < n - 1; i++) total += dist(points[i], points[i + 1]);
  if (closed && n > 2) total += dist(points[n - 1], points[0]);
  return total;
}

export function polygonCentroid(points: readonly Vec[]): Vec {
  const a = signedPolygonArea(points);
  if (Math.abs(a) < 1e-9) return boundsCenter(boundsOfPoints(points));
  let cx = 0;
  let cy = 0;
  for (let i = 0, n = points.length; i < n; i++) {
    const p = points[i];
    const q = points[(i + 1) % n];
    const f = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

/** Even-odd point in polygon test. */
export function pointInPolygon(p: Vec, points: readonly Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  if (l2 === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
}

export function distToPolyline(p: Vec, points: readonly Vec[], closed = false): number {
  let best = Infinity;
  const n = points.length;
  if (n === 1) return dist(p, points[0]);
  for (let i = 0; i < n - 1; i++) best = Math.min(best, distToSegment(p, points[i], points[i + 1]));
  if (closed && n > 2) best = Math.min(best, distToSegment(p, points[n - 1], points[0]));
  return best;
}

export function segmentsIntersect(a: Vec, b: Vec, c: Vec, d: Vec): boolean {
  const d1 = cross(sub(b, a), sub(c, a));
  const d2 = cross(sub(b, a), sub(d, a));
  const d3 = cross(sub(d, c), sub(a, c));
  const d4 = cross(sub(d, c), sub(b, c));
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  const onSeg = (p: Vec, q: Vec, r: Vec) =>
    Math.min(p.x, q.x) <= r.x && r.x <= Math.max(p.x, q.x) && Math.min(p.y, q.y) <= r.y && r.y <= Math.max(p.y, q.y);
  if (d1 === 0 && onSeg(a, b, c)) return true;
  if (d2 === 0 && onSeg(a, b, d)) return true;
  if (d3 === 0 && onSeg(c, d, a)) return true;
  if (d4 === 0 && onSeg(c, d, b)) return true;
  return false;
}

/** Whether a polygon/polyline outline touches an axis-aligned rectangle. */
export function outlineIntersectsBounds(points: readonly Vec[], closed: boolean, b: Bounds): boolean {
  if (points.length === 0) return false;
  const ob = boundsOfPoints(points);
  if (!boundsIntersect(ob, b)) return false;
  if (boundsContains(b, ob)) return true;
  for (const p of points) {
    if (p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY) return true;
  }
  const corners = boundsCorners(b);
  if (closed) {
    for (const c of corners) if (pointInPolygon(c, points)) return true;
  }
  const n = points.length;
  const segCount = closed ? n : n - 1;
  for (let i = 0; i < segCount; i++) {
    const p = points[i];
    const q = points[(i + 1) % n];
    for (let k = 0; k < 4; k++) {
      if (segmentsIntersect(p, q, corners[k], corners[(k + 1) % 4])) return true;
    }
  }
  return false;
}

/**
 * Sutherland–Hodgman clip of a polygon against the half-plane
 * `x <= value` (keep = 'below') or `x >= value` (keep = 'above') on the given axis.
 */
export function clipPolygonAxis(
  points: readonly Vec[],
  axis: 'x' | 'y',
  value: number,
  keep: 'below' | 'above',
): Vec[] {
  const inside = (p: Vec) => (keep === 'below' ? p[axis] <= value : p[axis] >= value);
  const intersect = (a: Vec, b: Vec): Vec => {
    const t = (value - a[axis]) / (b[axis] - a[axis]);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };
  const out: Vec[] = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const cur = points[i];
    const prev = points[(i + n - 1) % n];
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return out;
}

export function clipPolygonBand(points: readonly Vec[], axis: 'x' | 'y', from: number, to: number): Vec[] {
  return clipPolygonAxis(clipPolygonAxis(points, axis, from, 'above'), axis, to, 'below');
}

/**
 * Splits a polygon into consecutive bands along an axis so that each band's
 * area matches the requested share (shares are normalised). Used to divide a
 * bed between several plantings. Band edges are found by bisection, so the
 * result works for arbitrary (also concave) polygons.
 */
export function splitPolygonByShares(points: readonly Vec[], shares: readonly number[], axis: 'x' | 'y'): Vec[][] {
  const total = shares.reduce((s, v) => s + Math.max(0, v), 0);
  if (shares.length === 0) return [];
  if (shares.length === 1 || total <= 0) return shares.map(() => [...points]);
  const b = boundsOfPoints(points);
  const lo = axis === 'x' ? b.minX : b.minY;
  const hi = axis === 'x' ? b.maxX : b.maxY;
  const area = polygonArea(points);
  const areaBelow = (v: number) => polygonArea(clipPolygonAxis(points, axis, v, 'below'));
  const cuts: number[] = [lo];
  let acc = 0;
  for (let i = 0; i < shares.length - 1; i++) {
    acc += Math.max(0, shares[i]) / total;
    const target = area * acc;
    let a = cuts[cuts.length - 1];
    let z = hi;
    for (let k = 0; k < 50; k++) {
      const m = (a + z) / 2;
      if (areaBelow(m) < target) a = m;
      else z = m;
    }
    cuts.push((a + z) / 2);
  }
  cuts.push(hi);
  const bands: Vec[][] = [];
  for (let i = 0; i < shares.length; i++) bands.push(clipPolygonBand(points, axis, cuts[i], cuts[i + 1]));
  return bands;
}

/** Ramer–Douglas–Peucker simplification (used for freehand drawing). */
export function simplifyPath(points: readonly Vec[], epsilon: number): Vec[] {
  if (points.length < 3) return [...points];
  let maxD = 0;
  let idx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = distToSegment(points[i], first, last);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > epsilon) {
    const left = simplifyPath(points.slice(0, idx + 1), epsilon);
    const right = simplifyPath(points.slice(idx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export function ellipsePoints(rx: number, ry: number, segments = 64): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry });
  }
  return pts;
}

/** Whether the shape encloses an area. */
export function isClosedShape(shape: Shape): boolean {
  return shape.type === 'rect' || shape.type === 'ellipse' || shape.type === 'polygon';
}

/** Local-space outline. Closed shapes return a polygon; open ones a polyline. */
export function shapeOutline(shape: Shape, segments = 64): Vec[] {
  switch (shape.type) {
    case 'rect': {
      const w = shape.width / 2;
      const h = shape.height / 2;
      return [
        { x: -w, y: -h },
        { x: w, y: -h },
        { x: w, y: h },
        { x: -w, y: h },
      ];
    }
    case 'ellipse':
      return ellipsePoints(shape.rx, shape.ry, segments);
    case 'polygon':
    case 'polyline':
      return shape.points;
    case 'text': {
      const w = Math.max(1, shape.text.length) * shape.fontSize * 0.55;
      const h = shape.fontSize * 1.2;
      return [
        { x: -w / 2, y: -h / 2 },
        { x: w / 2, y: -h / 2 },
        { x: w / 2, y: h / 2 },
        { x: -w / 2, y: h / 2 },
      ];
    }
    case 'dimension': {
      const n = dimensionNormal(shape.a, shape.b);
      const off = scale(n, shape.offset);
      return [shape.a, shape.b, add(shape.b, off), add(shape.a, off)];
    }
  }
}

export function dimensionNormal(a: Vec, b: Vec): Vec {
  const d = sub(b, a);
  const l = len(d) || 1;
  return { x: -d.y / l, y: d.x / l };
}

/** Real-world area in mm² (0 for non-area shapes). Exact where closed-form exists. */
export function shapeArea(shape: Shape): number {
  switch (shape.type) {
    case 'rect':
      return shape.width * shape.height;
    case 'ellipse':
      return Math.PI * shape.rx * shape.ry;
    case 'polygon':
      return polygonArea(shape.points);
    case 'polyline':
      return polylineLength(shape.points) * shape.width;
    default:
      return 0;
  }
}

/** Perimeter (closed shapes) or length (open shapes) in mm. */
export function shapePerimeter(shape: Shape): number {
  switch (shape.type) {
    case 'rect':
      return 2 * (shape.width + shape.height);
    case 'ellipse': {
      // Ramanujan's approximation — accurate to well below measurement error.
      const a = shape.rx;
      const b = shape.ry;
      const h = ((a - b) * (a - b)) / ((a + b) * (a + b) || 1);
      return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
    }
    case 'polygon':
      return polylineLength(shape.points, true);
    case 'polyline':
      return polylineLength(shape.points);
    case 'dimension':
      return dist(shape.a, shape.b);
    default:
      return 0;
  }
}

export function shapeLocalBounds(shape: Shape): Bounds {
  if (shape.type === 'ellipse') return { minX: -shape.rx, minY: -shape.ry, maxX: shape.rx, maxY: shape.ry };
  const b = boundsOfPoints(shapeOutline(shape, 16));
  if (shape.type === 'polyline') return expandBounds(b, shape.width / 2);
  return b;
}

export function worldOutline(t: Transform, shape: Shape, segments = 64): Vec[] {
  return shapeOutline(shape, segments).map((p) => localToWorld(t, p));
}

export function worldBounds(t: Transform, shape: Shape): Bounds {
  if (shape.type === 'ellipse') {
    // Analytic bounds of a rotated ellipse.
    const r = t.rotation * DEG;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const hw = Math.sqrt(shape.rx * shape.rx * c * c + shape.ry * shape.ry * s * s);
    const hh = Math.sqrt(shape.rx * shape.rx * s * s + shape.ry * shape.ry * c * c);
    return { minX: t.x - hw, minY: t.y - hh, maxX: t.x + hw, maxY: t.y + hh };
  }
  const lb = shapeLocalBounds(shape);
  return boundsOfPoints(boundsCorners(lb).map((p) => localToWorld(t, p)));
}

/** Local-space oriented extents: the "length" and "width" a gardener would measure. */
export function shapeDimensions(shape: Shape): { width: number; height: number } {
  switch (shape.type) {
    case 'rect':
      return { width: shape.width, height: shape.height };
    case 'ellipse':
      return { width: shape.rx * 2, height: shape.ry * 2 };
    default: {
      const b = shapeLocalBounds(shape);
      return { width: boundsWidth(b), height: boundsHeight(b) };
    }
  }
}

/**
 * Hit-test a world point against a shape. `tolerance` (mm) widens thin
 * shapes so lines remain clickable at any zoom.
 */
export function hitTestShape(t: Transform, shape: Shape, p: Vec, tolerance: number, filled = true): boolean {
  const lp = worldToLocal(t, p);
  switch (shape.type) {
    case 'rect': {
      const inside = Math.abs(lp.x) <= shape.width / 2 + tolerance && Math.abs(lp.y) <= shape.height / 2 + tolerance;
      if (!inside) return false;
      if (filled) return true;
      return Math.abs(lp.x) >= shape.width / 2 - tolerance || Math.abs(lp.y) >= shape.height / 2 - tolerance;
    }
    case 'ellipse': {
      const rx = shape.rx + tolerance;
      const ry = shape.ry + tolerance;
      const v = (lp.x * lp.x) / (rx * rx) + (lp.y * lp.y) / (ry * ry);
      if (v > 1) return false;
      if (filled) return true;
      const irx = Math.max(0, shape.rx - tolerance);
      const iry = Math.max(0, shape.ry - tolerance);
      return irx === 0 || iry === 0 || (lp.x * lp.x) / (irx * irx) + (lp.y * lp.y) / (iry * iry) >= 1;
    }
    case 'polygon':
      return (filled && pointInPolygon(lp, shape.points)) || distToPolyline(lp, shape.points, true) <= tolerance;
    case 'polyline':
      return distToPolyline(lp, shape.points) <= shape.width / 2 + tolerance;
    case 'text': {
      const b = shapeLocalBounds(shape);
      return lp.x >= b.minX - tolerance && lp.x <= b.maxX + tolerance && lp.y >= b.minY - tolerance && lp.y <= b.maxY + tolerance;
    }
    case 'dimension': {
      const n = dimensionNormal(shape.a, shape.b);
      const off = scale(n, shape.offset);
      return distToSegment(lp, add(shape.a, off), add(shape.b, off)) <= tolerance * 1.5;
    }
  }
}

/** Scales a shape's local geometry by independent factors on local axes. */
export function scaleShape(shape: Shape, sx: number, sy: number): Shape {
  switch (shape.type) {
    case 'rect':
      return { ...shape, width: Math.abs(shape.width * sx), height: Math.abs(shape.height * sy) };
    case 'ellipse':
      return { ...shape, rx: Math.abs(shape.rx * sx), ry: Math.abs(shape.ry * sy) };
    case 'polygon':
      return { ...shape, points: shape.points.map((p) => ({ x: p.x * sx, y: p.y * sy })) };
    case 'polyline':
      return {
        ...shape,
        points: shape.points.map((p) => ({ x: p.x * sx, y: p.y * sy })),
        width: shape.width * Math.sqrt(Math.abs(sx * sy)),
      };
    case 'text':
      return { ...shape, fontSize: shape.fontSize * Math.sqrt(Math.abs(sx * sy)) };
    case 'dimension':
      return {
        ...shape,
        a: { x: shape.a.x * sx, y: shape.a.y * sy },
        b: { x: shape.b.x * sx, y: shape.b.y * sy },
      };
  }
}

/**
 * Re-centres point-based geometry so the local origin sits at the centre of
 * its bounding box. Returns the new shape and the world offset to add to the
 * transform position. Keeps rotation handles centred after vertex edits.
 */
export function recenterShape(shape: Shape): { shape: Shape; offset: Vec } {
  if (shape.type !== 'polygon' && shape.type !== 'polyline' && shape.type !== 'dimension') {
    return { shape, offset: { x: 0, y: 0 } };
  }
  const pts = shape.type === 'dimension' ? [shape.a, shape.b] : shape.points;
  const c = boundsCenter(boundsOfPoints(pts));
  if (Math.abs(c.x) < 1e-9 && Math.abs(c.y) < 1e-9) return { shape, offset: { x: 0, y: 0 } };
  const shift = (p: Vec) => ({ x: p.x - c.x, y: p.y - c.y });
  if (shape.type === 'dimension') return { shape: { ...shape, a: shift(shape.a), b: shift(shape.b) }, offset: c };
  return { shape: { ...shape, points: shape.points.map(shift) }, offset: c };
}

/** Converts any closed shape to a local-space polygon (ellipses are sampled). */
export function shapeToPolygon(shape: Shape, segments = 96): Vec[] | null {
  if (!isClosedShape(shape)) return null;
  return shapeOutline(shape, segments);
}
