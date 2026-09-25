/**
 * Canvas pointer interaction state machine. Converts pointer events into
 * editor commands. All geometry is computed in world millimetres; pixel
 * tolerances are converted with the current zoom.
 */
import {
  add,
  boundsFromCorners,
  dist,
  hitTestShape,
  isClosedShape,
  localToWorld,
  outlineIntersectsBounds,
  recenterShape,
  rotate,
  simplifyPath,
  sub,
  worldOutline,
  worldToLocal,
  type Bounds,
  type Shape,
  type Vec,
} from '../../domain/geometry';
import type { GardenObject, ObjectKind, ProjectDoc } from '../../domain/project';
import { makeObject, isObjectLocked, isObjectVisible, objectsInPaintOrder } from '../../domain/projectFactory';
import { kindInfo } from '../../domain/objectKinds';
import {
  addObjects,
  duplicateObjects,
  imagePxToWorld,
  moveObjects,
  rotateObjects,
  scaleObjects,
  selectionBounds,
  worldToImagePx,
} from '../../editor/commands';
import { buildSnapTargets, snapAngle, snapMove, snapPoint, type SnapGuide, type SnapTargets } from '../../editor/snapping';
import { editorApi, screenToWorld, type ToolId } from '../../editor/store';
import { handleWorld, resizeFromHandle, selectionFrame, type Frame } from './frame';
import { scaleShape } from '../../domain/geometry';

export const HANDLE_PX = 8;
export const ROTATE_HANDLE_OFFSET_PX = 26;
const HIT_TOLERANCE_PX = 5;
const CLICK_PX = 4;

export type Draft =
  | { kind: 'marquee'; a: Vec; b: Vec }
  | { kind: 'shape'; shape: Shape; transform: { x: number; y: number; rotation: number }; objKind: ObjectKind; label: string }
  | { kind: 'polygon'; points: Vec[]; cursor: Vec | null; closed: boolean; objKind: ObjectKind }
  | { kind: 'measure'; a: Vec; b: Vec }
  | { kind: 'calibrate'; a: Vec; b: Vec | null; bgId: string };

export interface OverlayState {
  draft: Draft | null;
  guides: SnapGuide[];
  hoverId: string | null;
  snapPoint: Vec | null;
}

type Gesture =
  | { type: 'none' }
  | { type: 'pan'; startScreen: Vec; startView: { x: number; y: number } }
  | { type: 'move'; start: Vec; ids: string[]; bounds: Bounds; targets: SnapTargets; moved: boolean; duplicate: boolean }
  | { type: 'resize'; handle: number; frame: Frame; ids: string[]; startDoc: ProjectDoc }
  | { type: 'rotate'; center: Vec; startAngle: number; ids: string[]; startRotation: number }
  | { type: 'marquee'; start: Vec; additive: boolean; startScreen: Vec }
  | { type: 'vertex'; id: string; index: number; targets: SnapTargets; last: Vec | null }
  | { type: 'draw-box'; tool: ToolId; start: Vec; startScreen: Vec; targets: SnapTargets }
  | { type: 'freehand'; points: Vec[] }
  | { type: 'measure'; start: Vec; targets: SnapTargets }
  | { type: 'bg-move'; bgId: string; start: Vec; startPos: Vec };

export interface InteractionContext {
  getSvgRect(): DOMRect;
  setOverlay(o: Partial<OverlayState>): void;
  getOverlay(): OverlayState;
  requestCalibration(bgId: string, a: Vec, b: Vec): void;
  onTextCreated(id: string): void;
  isSpaceDown(): boolean;
}

function st() {
  return editorApi.getState();
}

/** Default size for click-to-create (no drag). */
const DEFAULT_SIZES: Partial<Record<ObjectKind, { w: number; h: number }>> = {
  bed: { w: 3000, h: 1200 },
  'raised-bed': { w: 2400, h: 1200 },
  planter: { w: 800, h: 400 },
  'vegetable-bed': { w: 3000, h: 1200 },
  'flower-bed': { w: 2000, h: 1000 },
  'herb-area': { w: 1200, h: 1200 },
  'ground-crop-area': { w: 4000, h: 3000 },
  greenhouse: { w: 3000, h: 2000 },
  compost: { w: 1000, h: 1000 },
  building: { w: 6000, h: 4000 },
  tree: { w: 4000, h: 4000 },
  shrub: { w: 1200, h: 1200 },
  water: { w: 2000, h: 1500 },
};

export function defaultSize(kind: ObjectKind): { w: number; h: number } {
  return DEFAULT_SIZES[kind] ?? { w: 2000, h: 1000 };
}

export class CanvasInteraction {
  private gesture: Gesture = { type: 'none' };
  private polygon: { points: Vec[]; kind: ObjectKind; open: boolean } | null = null;
  private calib: { a: Vec; bgId: string } | null = null;
  private downScreen: Vec = { x: 0, y: 0 };
  private lastClick = { time: 0, p: { x: 0, y: 0 } };
  constructor(private ctx: InteractionContext) {}

  // --- helpers -------------------------------------------------------------

  private screenPoint(e: { clientX: number; clientY: number }): Vec {
    const r = this.ctx.getSvgRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private world(e: { clientX: number; clientY: number }): Vec {
    return screenToWorld(st().view, this.screenPoint(e));
  }

  private tol(px = HIT_TOLERANCE_PX): number {
    return px / st().view.scale;
  }

  private snapEnabled(e: { ctrlKey: boolean; metaKey: boolean }): boolean {
    return st().snapping && !(e.ctrlKey || e.metaKey);
  }

  private snapOpts(e: { ctrlKey: boolean; metaKey: boolean }) {
    const doc = st().doc!;
    const on = this.snapEnabled(e);
    return {
      grid: on && doc.settings.snapToGrid ? doc.settings.gridSizeMm : null,
      objects: on && doc.settings.snapToObjects,
      tolerance: this.tol(8),
    };
  }

  private viewBounds(): Bounds {
    const { view, viewport } = st();
    const a = screenToWorld(view, { x: 0, y: 0 });
    const b = screenToWorld(view, { x: viewport.width, y: viewport.height });
    return boundsFromCorners(a, b);
  }

  private targets(exclude: string[] = []): SnapTargets {
    return buildSnapTargets(st().doc!, new Set(exclude), this.viewBounds());
  }

  private snap(p: Vec, e: { ctrlKey: boolean; metaKey: boolean }, targets: SnapTargets): Vec {
    const r = snapPoint(p, targets, this.snapOpts(e));
    this.ctx.setOverlay({ guides: r.guides, snapPoint: r.kind === 'vertex' ? r.point : null });
    return r.point;
  }

  /** Topmost selectable object under a world point. */
  hitObject(p: Vec, includeLocked = false): GardenObject | null {
    const doc = st().doc;
    if (!doc) return null;
    const objs = objectsInPaintOrder(doc);
    const tol = this.tol();
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      if (!isObjectVisible(doc, o)) continue;
      if (!includeLocked && isObjectLocked(doc, o)) continue;
      if (o.shape.type === 'dimension') {
        if (hitTestShape(o.transform, o.shape, p, tol * 2)) return o;
        continue;
      }
      if (hitTestShape(o.transform, o.shape, p, tol, isClosedShape(o.shape) || o.shape.type === 'text' || o.kind === 'path')) return o;
    }
    return null;
  }

  private hitBackground(p: Vec): string | null {
    const doc = st().doc!;
    const bgLayer = doc.layers.find((l) => l.role === 'background');
    if (bgLayer && (!bgLayer.visible || bgLayer.locked)) return null;
    for (let i = doc.backgrounds.length - 1; i >= 0; i--) {
      const bg = doc.backgrounds[i];
      if (!bg.visible) continue;
      const px = worldToImagePx(bg, p);
      const c = bg.crop ?? { x: 0, y: 0, width: bg.naturalWidth, height: bg.naturalHeight };
      if (px.x >= c.x && px.x <= c.x + c.width && px.y >= c.y && px.y <= c.y + c.height) return bg.id;
    }
    return null;
  }

  /** Which frame handle (0–7 resize, 8 rotate) is under a screen point. */
  private hitHandle(screen: Vec): number | null {
    const { doc, selection, view } = st();
    if (!doc || !selection.length) return null;
    if (selection.some((id) => doc.objects[id] && isObjectLocked(doc, doc.objects[id]))) return null;
    const frame = selectionFrame(doc, selection);
    if (!frame) return null;
    const single = selection.length === 1 ? doc.objects[selection[0]] : null;
    // No frame handles while editing points, or for two-point lines (they have endpoint handles).
    if (single && (st().vertexEditId === single.id || single.shape.type === 'dimension' || (single.shape.type === 'polyline' && single.shape.points.length === 2))) return null;
    const toScreen = (w: Vec) => ({ x: w.x * view.scale + view.x, y: w.y * view.scale + view.y });
    const rh = rotateHandleScreen(frame, view);
    if (dist(screen, rh) <= HANDLE_PX) return 8;
    for (let i = 0; i < 8; i++) {
      const hs = toScreen(handleWorld(frame, i));
      if (Math.abs(hs.x - screen.x) <= HANDLE_PX && Math.abs(hs.y - screen.y) <= HANDLE_PX) return i;
    }
    return null;
  }

  /** Vertex handle under the pointer for the vertex-edit object or 2-point lines. */
  private hitVertex(screen: Vec): { id: string; index: number } | null {
    const { doc, selection, view, vertexEditId } = st();
    if (!doc) return null;
    const id = vertexEditId ?? (selection.length === 1 ? selection[0] : null);
    if (!id) return null;
    const o = doc.objects[id];
    if (!o || isObjectLocked(doc, o)) return null;
    const pts = vertexPoints(o, vertexEditId === id);
    for (let i = 0; i < pts.length; i++) {
      const w = localToWorld(o.transform, pts[i]);
      const s = { x: w.x * view.scale + view.x, y: w.y * view.scale + view.y };
      if (dist(s, screen) <= HANDLE_PX + 1) return { id, index: i };
    }
    return null;
  }

  cursorFor(e: { clientX: number; clientY: number }): string {
    const { tool } = st();
    if (this.gesture.type === 'pan' || this.ctx.isSpaceDown() || tool === 'hand') return this.gesture.type === 'pan' ? 'grabbing' : 'grab';
    if (tool !== 'select') return 'crosshair';
    const s = this.screenPoint(e);
    if (this.hitVertex(s)) return 'move';
    const h = this.hitHandle(s);
    if (h === 8) return 'alias';
    if (h != null) {
      const frame = selectionFrame(st().doc!, st().selection)!;
      return rotatedCursor(h, frame.rotation);
    }
    return 'default';
  }

  // --- pointer events ------------------------------------------------------

  pointerDown(e: PointerEvent): void {
    const state = st();
    const doc = state.doc;
    if (!doc) return;
    const screen = this.screenPoint(e);
    this.downScreen = screen;
    const p = this.world(e);
    const tool = state.tool;

    // Pan: middle button, Space+drag, or Hand tool.
    if (e.button === 1 || this.ctx.isSpaceDown() || tool === 'hand') {
      this.gesture = { type: 'pan', startScreen: screen, startView: { x: state.view.x, y: state.view.y } };
      return;
    }
    if (e.button !== 0) return;

    const now = performance.now();
    const isDouble = now - this.lastClick.time < 350 && dist(screen, this.lastClick.p) < 6;
    this.lastClick = { time: now, p: screen };

    switch (tool) {
      case 'select':
        this.selectDown(e, p, screen, isDouble);
        return;
      case 'rect':
      case 'ellipse':
      case 'tree':
      case 'shrub': {
        const targets = this.targets();
        const start = this.snap(p, e, targets);
        this.gesture = { type: 'draw-box', tool, start, startScreen: screen, targets };
        return;
      }
      case 'polygon':
      case 'polyline':
        this.polygonDown(e, p, isDouble);
        return;
      case 'freehand':
        this.gesture = { type: 'freehand', points: [p] };
        return;
      case 'text':
        this.createText(p);
        return;
      case 'dimension':
      case 'measure': {
        const targets = this.targets();
        const start = this.snap(p, e, targets);
        if (tool === 'dimension' && this.polygon) {
          this.finishDimension(start);
          return;
        }
        if (tool === 'dimension') {
          this.polygon = { points: [start], kind: 'dimension', open: true };
          this.ctx.setOverlay({ draft: { kind: 'measure', a: start, b: start } });
          return;
        }
        this.gesture = { type: 'measure', start, targets };
        this.ctx.setOverlay({ draft: { kind: 'measure', a: start, b: start } });
        return;
      }
      case 'calibrate':
        this.calibrateDown(e, p);
        return;
    }
  }

  private selectDown(e: PointerEvent, p: Vec, screen: Vec, isDouble: boolean) {
    const state = st();
    const doc = state.doc!;
    const vtx = this.hitVertex(screen);
    if (vtx) {
      // Alt-click removes a vertex in vertex-edit mode.
      const o = doc.objects[vtx.id];
      if (e.altKey && o.shape.type === 'polygon' && o.shape.points.length > 3) {
        state.commit('Delete vertex', (d) => {
          const s = d.objects[vtx.id].shape;
          if (s.type === 'polygon') s.points.splice(vtx.index, 1);
          recenterObject(d.objects[vtx.id]);
        });
        return;
      }
      state.beginGesture();
      this.gesture = { type: 'vertex', id: vtx.id, index: vtx.index, targets: this.targets([vtx.id]), last: null };
      return;
    }
    const handle = this.hitHandle(screen);
    if (handle != null) {
      const frame = selectionFrame(doc, state.selection)!;
      state.beginGesture();
      if (handle === 8) {
        this.gesture = {
          type: 'rotate',
          center: frame.center,
          startAngle: Math.atan2(p.y - frame.center.y, p.x - frame.center.x),
          ids: state.selection,
          startRotation: frame.rotation,
        };
      } else {
        this.gesture = { type: 'resize', handle, frame, ids: state.selection, startDoc: doc };
      }
      return;
    }
    const hit = this.hitObject(p);
    if (isDouble && hit && (hit.shape.type === 'polygon' || hit.shape.type === 'polyline')) {
      if (state.vertexEditId === hit.id) {
        // Double-click on an edge adds a vertex.
        this.insertVertex(hit, p);
      } else {
        state.setSelection([hit.id]);
        state.setVertexEdit(hit.id);
      }
      return;
    }
    if (isDouble && hit && hit.shape.type === 'text') {
      this.ctx.onTextCreated(hit.id);
      return;
    }
    if (hit) {
      const mod = e.shiftKey || e.ctrlKey || e.metaKey;
      const already = state.selection.includes(hit.id);
      if (mod) {
        state.setSelection([hit.id], 'toggle');
        return;
      }
      if (!already) state.setSelection([hit.id]);
      const ids = st().selection;
      const bounds = selectionBounds(doc, ids);
      if (!bounds) return;
      state.beginGesture();
      this.gesture = { type: 'move', start: p, ids, bounds, targets: this.targets(ids), moved: false, duplicate: e.altKey };
      return;
    }
    // Background image drag (when selected and unlocked).
    const bgId = this.hitBackground(p);
    if (bgId && state.selectedBackgroundId === bgId) {
      const bg = doc.backgrounds.find((b) => b.id === bgId)!;
      if (!bg.locked) {
        state.beginGesture();
        this.gesture = { type: 'bg-move', bgId, start: p, startPos: { x: bg.transform.x, y: bg.transform.y } };
        return;
      }
    }
    this.gesture = { type: 'marquee', start: p, additive: e.shiftKey || e.ctrlKey || e.metaKey, startScreen: screen };
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      state.setSelection([]);
      state.setVertexEdit(null);
    }
    this.ctx.setOverlay({ draft: { kind: 'marquee', a: p, b: p } });
  }

  private insertVertex(o: GardenObject, p: Vec) {
    const s = o.shape;
    if (s.type !== 'polygon' && s.type !== 'polyline') return;
    const lp = worldToLocal(o.transform, p);
    const pts = s.points;
    const n = pts.length;
    const segs = s.type === 'polygon' ? n : n - 1;
    let best = -1;
    let bestD = this.tol(8);
    for (let i = 0; i < segs; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const ab = sub(b, a);
      const l2 = ab.x * ab.x + ab.y * ab.y || 1;
      const t = Math.max(0, Math.min(1, ((lp.x - a.x) * ab.x + (lp.y - a.y) * ab.y) / l2));
      const d = dist(lp, { x: a.x + ab.x * t, y: a.y + ab.y * t });
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0) return;
    st().commit('Add vertex', (d) => {
      const sh = d.objects[o.id].shape;
      if (sh.type === 'polygon' || sh.type === 'polyline') sh.points.splice(best + 1, 0, lp);
    });
  }

  private polygonDown(e: PointerEvent, p: Vec, isDouble: boolean) {
    const state = st();
    const targets = this.targets();
    const sp = this.snap(p, e, targets);
    const kind = state.drawKind;
    const open = state.tool === 'polyline';
    if (!this.polygon) {
      this.polygon = { points: [sp], kind, open };
    } else {
      const pts = this.polygon.points;
      const first = pts[0];
      const constrained = e.shiftKey ? constrainAngle(pts[pts.length - 1], sp) : sp;
      if (isDouble) {
        this.finishPolygon();
        return;
      }
      if (!open && pts.length >= 3 && dist(constrained, first) <= this.tol(10)) {
        this.finishPolygon();
        return;
      }
      if (dist(constrained, pts[pts.length - 1]) > this.tol(2)) pts.push(constrained);
    }
    this.ctx.setOverlay({ draft: { kind: 'polygon', points: [...this.polygon.points], cursor: sp, closed: !open, objKind: kind } });
  }

  private calibrateDown(e: PointerEvent, p: Vec) {
    const state = st();
    const doc = state.doc!;
    const bgId = state.selectedBackgroundId ?? (doc.backgrounds.length === 1 ? doc.backgrounds[0].id : null) ?? this.hitBackground(p);
    if (!bgId) {
      state.showFlash('Import or select a blueprint image first, then click two points with a known distance.', 'error');
      return;
    }
    const targets = this.targets();
    const sp = this.snap(p, e, targets);
    if (!this.calib) {
      this.calib = { a: sp, bgId };
      this.ctx.setOverlay({ draft: { kind: 'calibrate', a: sp, b: null, bgId } });
    } else {
      const a = this.calib.a;
      const b = e.shiftKey ? constrainAngle(a, sp) : sp;
      this.calib = null;
      this.ctx.setOverlay({ draft: null, guides: [], snapPoint: null });
      if (dist(a, b) > 0) this.ctx.requestCalibration(bgId, a, b);
    }
  }

  pointerMove(e: PointerEvent): void {
    const state = st();
    const doc = state.doc;
    if (!doc) return;
    const screen = this.screenPoint(e);
    const p = screenToWorld(state.view, screen);
    state.setCursorWorld(p);
    const g = this.gesture;
    switch (g.type) {
      case 'pan':
        state.setView({ ...state.view, x: g.startView.x + screen.x - g.startScreen.x, y: g.startView.y + screen.y - g.startScreen.y });
        return;
      case 'move': {
        let dx = p.x - g.start.x;
        let dy = p.y - g.start.y;
        if (!g.moved && Math.hypot(screen.x - this.downScreen.x, screen.y - this.downScreen.y) < CLICK_PX) return;
        g.moved = true;
        if (e.shiftKey) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        const snapped = snapMove(g.bounds, dx, dy, g.targets, this.snapOpts(e));
        if (e.shiftKey) {
          if (dx === 0) snapped.dx = 0;
          if (dy === 0) snapped.dy = 0;
        }
        this.ctx.setOverlay({ guides: snapped.guides });
        const ids = g.ids;
        const duplicate = g.duplicate;
        state.updateGesture((d) => {
          if (duplicate) {
            const copies = duplicateObjects(d, ids, { x: snapped.dx, y: snapped.dy });
            pendingSelection = copies;
          } else moveObjects(d, ids, snapped.dx, snapped.dy);
        });
        return;
      }
      case 'resize': {
        const keep = e.shiftKey || g.frame.forceAspect;
        const r = resizeFromHandle(g.frame, g.handle, p, keep, e.altKey);
        state.updateGesture((d) => applyResize(d, g.ids, g.frame, r));
        return;
      }
      case 'rotate': {
        const a = Math.atan2(p.y - g.center.y, p.x - g.center.x);
        let delta = ((a - g.startAngle) * 180) / Math.PI;
        if (e.shiftKey) delta = snapAngle(g.startRotation + delta) - g.startRotation;
        state.updateGesture((d) => rotateObjects(d, g.ids, delta, g.center));
        return;
      }
      case 'marquee':
        this.ctx.setOverlay({ draft: { kind: 'marquee', a: g.start, b: p } });
        return;
      case 'vertex': {
        const sp = this.snap(p, e, g.targets);
        g.last = sp;
        state.updateGesture((d) => setVertex(d, g.id, g.index, sp, false));
        return;
      }
      case 'draw-box': {
        let b = this.snap(p, e, g.targets);
        const kind = g.tool === 'tree' ? 'tree' : g.tool === 'shrub' ? 'shrub' : state.drawKind;
        const circle = g.tool === 'tree' || g.tool === 'shrub';
        let a = g.start;
        if (circle) {
          const r = dist(a, b);
          this.ctx.setOverlay({
            draft: { kind: 'shape', shape: { type: 'ellipse', rx: r, ry: r }, transform: { x: a.x, y: a.y, rotation: 0 }, objKind: kind, label: `⌀ ${(2 * r / 1000).toFixed(2)} m` },
          });
          return;
        }
        if (e.shiftKey) {
          const s = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
          b = { x: a.x + Math.sign(b.x - a.x || 1) * s, y: a.y + Math.sign(b.y - a.y || 1) * s };
        }
        if (e.altKey) a = { x: 2 * a.x - b.x, y: 2 * a.y - b.y };
        const w = Math.abs(b.x - a.x);
        const h = Math.abs(b.y - a.y);
        const shape: Shape = g.tool === 'ellipse' ? { type: 'ellipse', rx: w / 2, ry: h / 2 } : { type: 'rect', width: w, height: h };
        this.ctx.setOverlay({
          draft: { kind: 'shape', shape, transform: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, rotation: 0 }, objKind: kind, label: `${(w / 1000).toFixed(2)} × ${(h / 1000).toFixed(2)} m` },
        });
        return;
      }
      case 'freehand': {
        const last = g.points[g.points.length - 1];
        if (dist(last, p) > this.tol(3)) g.points.push(p);
        this.ctx.setOverlay({ draft: { kind: 'polygon', points: g.points, cursor: null, closed: false, objKind: state.drawKind } });
        return;
      }
      case 'measure': {
        let b = this.snap(p, e, g.targets);
        if (e.shiftKey) b = constrainAngle(g.start, b);
        this.ctx.setOverlay({ draft: { kind: 'measure', a: g.start, b } });
        return;
      }
      case 'bg-move':
        state.updateGesture((d) => {
          const bg = d.backgrounds.find((x) => x.id === g.bgId);
          if (bg) {
            bg.transform.x = g.startPos.x + p.x - g.start.x;
            bg.transform.y = g.startPos.y + p.y - g.start.y;
          }
        });
        return;
      case 'none':
        break;
    }
    // Idle hover / rubber bands
    if (this.polygon && (state.tool === 'polygon' || state.tool === 'polyline')) {
      let sp = snapPoint(p, this.targets(), this.snapOpts(e)).point;
      if (e.shiftKey) sp = constrainAngle(this.polygon.points[this.polygon.points.length - 1], sp);
      this.ctx.setOverlay({ draft: { kind: 'polygon', points: [...this.polygon.points], cursor: sp, closed: !this.polygon.open, objKind: this.polygon.kind } });
      return;
    }
    if (this.polygon && state.tool === 'dimension') {
      let sp = snapPoint(p, this.targets(), this.snapOpts(e)).point;
      if (e.shiftKey) sp = constrainAngle(this.polygon.points[0], sp);
      this.ctx.setOverlay({ draft: { kind: 'measure', a: this.polygon.points[0], b: sp } });
      return;
    }
    if (this.calib) {
      let sp = snapPoint(p, this.targets(), this.snapOpts(e)).point;
      if (e.shiftKey) sp = constrainAngle(this.calib.a, sp);
      this.ctx.setOverlay({ draft: { kind: 'calibrate', a: this.calib.a, b: sp, bgId: this.calib.bgId } });
      return;
    }
    if (state.tool === 'select') {
      const hover = this.hitObject(p);
      const id = hover?.id ?? null;
      if (id !== this.ctx.getOverlay().hoverId) this.ctx.setOverlay({ hoverId: id });
    } else if (['rect', 'ellipse', 'tree', 'shrub', 'polygon', 'polyline', 'dimension', 'measure', 'calibrate', 'text'].includes(state.tool)) {
      const r = snapPoint(p, this.targets(), this.snapOpts(e));
      this.ctx.setOverlay({ snapPoint: r.kind === 'vertex' || r.kind === 'grid' ? r.point : null, guides: r.guides });
    }
  }

  pointerUp(e: PointerEvent): void {
    const state = st();
    const doc = state.doc;
    const g = this.gesture;
    this.gesture = { type: 'none' };
    if (!doc) return;
    const screen = this.screenPoint(e);
    const p = screenToWorld(state.view, screen);
    switch (g.type) {
      case 'move':
        if (!g.moved) {
          state.cancelGesture();
          // Plain click on an already-selected object inside a multi-selection selects just it.
          const hit = this.hitObject(p);
          if (hit && state.selection.length > 1 && !e.shiftKey && !e.ctrlKey && !e.metaKey) state.setSelection([hit.id]);
        } else {
          const sel = g.duplicate ? pendingSelection : undefined;
          state.endGesture(g.duplicate ? 'Duplicate' : 'Move', sel ?? undefined);
          pendingSelection = null;
        }
        break;
      case 'resize':
        state.endGesture('Resize');
        break;
      case 'rotate':
        state.endGesture('Rotate');
        break;
      case 'vertex':
        // Gestures are applied to their base document, so the final update must include the move.
        if (g.last) {
          const last = g.last;
          state.updateGesture((d) => setVertex(d, g.id, g.index, last, true));
        }
        state.endGesture('Edit point');
        break;
      case 'bg-move':
        state.endGesture('Move blueprint');
        break;
      case 'marquee': {
        const b = boundsFromCorners(g.start, p);
        const moved = Math.hypot(screen.x - g.startScreen.x, screen.y - g.startScreen.y) > CLICK_PX;
        if (moved) {
          const ids = objectsInPaintOrder(doc)
            .filter((o) => isObjectVisible(doc, o) && !isObjectLocked(doc, o))
            .filter((o) => {
              const closed = isClosedShape(o.shape) || o.shape.type === 'text';
              return outlineIntersectsBounds(worldOutline(o.transform, o.shape, 32), closed, b);
            })
            .map((o) => o.id);
          state.setSelection(ids, g.additive ? 'add' : 'replace');
        } else {
          const bg = this.hitBackground(p);
          if (bg && !g.additive) state.selectBackground(bg);
        }
        break;
      }
      case 'draw-box':
        this.finishBox(g, p, screen, e);
        break;
      case 'freehand':
        this.finishFreehand(g.points);
        break;
      case 'measure':
        // Keep the measurement visible until the next action.
        break;
      default:
        break;
    }
    this.ctx.setOverlay({ guides: [], snapPoint: null, ...(g.type === 'marquee' ? { draft: null } : {}) });
  }

  private finishBox(g: Extract<Gesture, { type: 'draw-box' }>, p: Vec, screen: Vec, e: PointerEvent) {
    const state = st();
    const doc = state.doc!;
    const clicked = Math.hypot(screen.x - g.startScreen.x, screen.y - g.startScreen.y) < CLICK_PX;
    const kind: ObjectKind = g.tool === 'tree' ? 'tree' : g.tool === 'shrub' ? 'shrub' : state.drawKind;
    let shape: Shape;
    let center: Vec;
    if (clicked) {
      const s = defaultSize(kind);
      center = g.start;
      shape = g.tool === 'rect' ? { type: 'rect', width: s.w, height: s.h } : { type: 'ellipse', rx: s.w / 2, ry: s.h / 2 };
    } else if (g.tool === 'tree' || g.tool === 'shrub') {
      const b = snapPoint(p, g.targets, this.snapOpts(e)).point;
      const r = Math.max(50, dist(g.start, b));
      center = g.start;
      shape = { type: 'ellipse', rx: r, ry: r };
    } else {
      let b = snapPoint(p, g.targets, this.snapOpts(e)).point;
      let a = g.start;
      if (e.shiftKey) {
        const s = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
        b = { x: a.x + Math.sign(b.x - a.x || 1) * s, y: a.y + Math.sign(b.y - a.y || 1) * s };
      }
      if (e.altKey) a = { x: 2 * a.x - b.x, y: 2 * a.y - b.y };
      const w = Math.max(10, Math.abs(b.x - a.x));
      const h = Math.max(10, Math.abs(b.y - a.y));
      center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      shape = g.tool === 'ellipse' ? { type: 'ellipse', rx: w / 2, ry: h / 2 } : { type: 'rect', width: w, height: h };
    }
    const obj = makeObject(doc, kind, { x: center.x, y: center.y, rotation: 0 }, shape);
    state.commit(`Add ${kindInfo(kind).label.toLowerCase()}`, (d) => addObjects(d, [obj]), { select: [obj.id] });
    this.ctx.setOverlay({ draft: null });
    if (kind === 'tree' || kind === 'shrub') window.dispatchEvent(new CustomEvent('gtk:object-created', { detail: { id: obj.id, kind } }));
  }

  private finishFreehand(points: Vec[]) {
    const state = st();
    const doc = state.doc!;
    this.ctx.setOverlay({ draft: null });
    const simplified = simplifyPath(points, this.tol(2.5));
    const kind = state.drawKind;
    const open = kind === 'path' || kind === 'line';
    if (simplified.length < (open ? 2 : 3)) return;
    this.createPointObject(doc, kind, simplified, open, 'Draw freehand');
  }

  finishPolygon(): void {
    const poly = this.polygon;
    this.polygon = null;
    this.ctx.setOverlay({ draft: null, guides: [], snapPoint: null });
    if (!poly) return;
    const state = st();
    const doc = state.doc!;
    const pts = dedupe(poly.points, this.tol(1));
    if (pts.length < (poly.open ? 2 : 3)) return;
    this.createPointObject(doc, poly.kind, pts, poly.open, poly.open ? 'Draw line' : 'Draw polygon');
  }

  private createPointObject(doc: ProjectDoc, kind: ObjectKind, pts: Vec[], open: boolean, label: string) {
    let objKind = kind;
    if (open && objKind !== 'path' && objKind !== 'line') objKind = 'line';
    if (!open && (objKind === 'path' || objKind === 'line')) objKind = 'area';
    const width = objKind === 'path' ? 1000 : 0;
    const shape: Shape = open ? { type: 'polyline', points: pts, width } : { type: 'polygon', points: pts };
    const rc = recenterShape(shape);
    const obj = makeObject(doc, objKind, { x: rc.offset.x, y: rc.offset.y, rotation: 0 }, rc.shape);
    st().commit(label, (d) => addObjects(d, [obj]), { select: [obj.id] });
  }

  private finishDimension(b: Vec) {
    const poly = this.polygon;
    this.polygon = null;
    this.ctx.setOverlay({ draft: null, guides: [], snapPoint: null });
    if (!poly) return;
    const a = poly.points[0];
    if (dist(a, b) < this.tol(3)) return;
    const doc = st().doc!;
    const shape: Shape = { type: 'dimension', a, b, offset: 0 };
    const rc = recenterShape(shape);
    const obj = makeObject(doc, 'dimension', { x: rc.offset.x, y: rc.offset.y, rotation: 0 }, rc.shape, { name: 'Dimension' });
    st().commit('Add dimension', (d) => addObjects(d, [obj]), { select: [obj.id] });
  }

  private createText(p: Vec) {
    const state = st();
    const doc = state.doc!;
    const fontSize = Math.max(100, Math.round(14 / state.view.scale / 10) * 10);
    const obj = makeObject(doc, 'label', { x: p.x, y: p.y, rotation: 0 }, { type: 'text', text: 'Label', fontSize }, { name: 'Label' });
    state.commit('Add text', (d) => addObjects(d, [obj]), { select: [obj.id] });
    state.setTool('select');
    this.ctx.onTextCreated(obj.id);
  }

  /** Keyboard: finish/cancel multi-click tools. Returns true when handled. */
  key(e: KeyboardEvent): boolean {
    if (e.key === 'Escape') {
      const had = !!(this.polygon || this.calib || this.gesture.type !== 'none' || this.ctx.getOverlay().draft);
      if (this.gesture.type !== 'none' && this.gesture.type !== 'pan') st().cancelGesture();
      this.polygon = null;
      this.calib = null;
      this.gesture = { type: 'none' };
      this.ctx.setOverlay({ draft: null, guides: [], snapPoint: null });
      return had;
    }
    if (e.key === 'Enter' && this.polygon && this.polygon.kind !== 'dimension') {
      this.finishPolygon();
      return true;
    }
    if ((e.key === 'Backspace' || e.key === 'Delete') && this.polygon && this.polygon.points.length > 1) {
      this.polygon.points.pop();
      this.ctx.setOverlay({ draft: { kind: 'polygon', points: [...this.polygon.points], cursor: null, closed: !this.polygon.open, objKind: this.polygon.kind } });
      return true;
    }
    return false;
  }

  hasPendingDrawing(): boolean {
    return !!(this.polygon || this.calib);
  }

  reset(): void {
    this.polygon = null;
    this.calib = null;
    this.gesture = { type: 'none' };
    this.ctx.setOverlay({ draft: null, guides: [], snapPoint: null });
  }
}

let pendingSelection: string[] | null = null;

function constrainAngle(from: Vec, to: Vec): Vec {
  const d = sub(to, from);
  const len = Math.hypot(d.x, d.y);
  const ang = snapAngle((Math.atan2(d.y, d.x) * 180) / Math.PI);
  return add(from, rotate({ x: len, y: 0 }, ang));
}

function dedupe(pts: Vec[], tol: number): Vec[] {
  const out: Vec[] = [];
  for (const p of pts) if (!out.length || dist(out[out.length - 1], p) > tol) out.push(p);
  if (out.length > 2 && dist(out[0], out[out.length - 1]) <= tol) out.pop();
  return out;
}

function setVertex(d: ProjectDoc, id: string, index: number, world: Vec, recenter: boolean): void {
  const o = d.objects[id];
  if (!o) return;
  const lp = worldToLocal(o.transform, world);
  const s = o.shape;
  if (s.type === 'polygon' || s.type === 'polyline') s.points[index] = lp;
  else if (s.type === 'dimension') {
    if (index === 0) s.a = lp;
    else s.b = lp;
  }
  if (recenter) recenterObject(o);
}

export function recenterObject(o: GardenObject): void {
  const rc = recenterShape(o.shape);
  if (rc.offset.x === 0 && rc.offset.y === 0) return;
  o.shape = rc.shape;
  const off = rotate(rc.offset, o.transform.rotation);
  o.transform.x += off.x;
  o.transform.y += off.y;
}

/** Applies a frame resize to the selection inside a gesture. */
function applyResize(d: ProjectDoc, ids: string[], frame: Frame, r: ReturnType<typeof resizeFromHandle>) {
  if (frame.single && ids.length === 1) {
    const o = d.objects[ids[0]];
    if (!o) return;
    o.shape = scaleShape(o.shape, r.fx, r.fy);
    const rc = recenterShape(o.shape);
    o.shape = rc.shape;
    o.transform.x = r.center.x;
    o.transform.y = r.center.y;
    return;
  }
  scaleObjects(d, ids, r.fx, r.fy, r.anchor);
}

export function rotateHandleScreen(frame: Frame, view: { scale: number; x: number; y: number }): Vec {
  const top = handleWorld(frame, 1);
  const ts = { x: top.x * view.scale + view.x, y: top.y * view.scale + view.y };
  const up = rotate({ x: 0, y: -ROTATE_HANDLE_OFFSET_PX }, frame.rotation);
  return { x: ts.x + up.x, y: ts.y + up.y };
}

function rotatedCursor(handle: number, rotation: number): string {
  const cursors = ['ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize'];
  const baseAngle = [315, 0, 45, 90, 135, 180, 225, 270][handle];
  const a = (((baseAngle + rotation) % 180) + 180) % 180;
  return cursors[Math.round(a / 45) % 4];
}

/** Local points that get vertex handles. */
export function vertexPoints(o: GardenObject, editing: boolean): Vec[] {
  const s = o.shape;
  if (s.type === 'dimension') return [s.a, s.b];
  if (s.type === 'polyline' && (editing || s.points.length === 2)) return s.points;
  if (s.type === 'polygon' && editing) return s.points;
  return [];
}

export { imagePxToWorld };
