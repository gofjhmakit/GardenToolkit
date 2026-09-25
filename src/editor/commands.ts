/**
 * Editor commands: pure mutations of a ProjectDoc (usually an immer draft).
 *
 * Commands contain the editing semantics (grouping, z-order, duplication,
 * calibration…) and are independent of React and of the undo system, so
 * they can be unit-tested directly. The store wraps them in history entries.
 */
import { z } from 'zod';
import { newId } from '../lib/ids';
import {
  add,
  boundsCenter,
  boundsOfPoints,
  emptyBounds,
  isEmptyBounds,
  normalizeAngle,
  recenterShape,
  rotate,
  rotateAround,
  scaleShape,
  sub,
  unionBounds,
  worldBounds,
  type Bounds,
  type Vec,
} from '../domain/geometry';
import {
  GardenObjectSchema,
  GroupSchema,
  PlantingSchema,
  type BackgroundImage,
  type GardenObject,
  type Group,
  type Layer,
  type ObjectKind,
  type Planting,
  type ProjectDoc,
} from '../domain/project';
import { defaultLayerFor, nextCode } from '../domain/projectFactory';
import { kindInfo } from '../domain/objectKinds';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function layerById(doc: ProjectDoc, id: string): Layer | undefined {
  return doc.layers.find((l) => l.id === id);
}

/** Expands a selection so that selecting one group member selects the whole group. */
export function expandToGroups(doc: ProjectDoc, ids: readonly string[]): string[] {
  const out = new Set<string>();
  const groups = new Set<string>();
  for (const id of ids) {
    const o = doc.objects[id];
    if (!o) continue;
    out.add(id);
    if (o.groupId) groups.add(o.groupId);
  }
  if (groups.size) {
    for (const o of Object.values(doc.objects)) if (o.groupId && groups.has(o.groupId)) out.add(o.id);
  }
  return [...out];
}

export function objectBounds(o: GardenObject): Bounds {
  return worldBounds(o.transform, o.shape);
}

export function selectionBounds(doc: ProjectDoc, ids: readonly string[]): Bounds | null {
  let b = emptyBounds();
  for (const id of ids) {
    const o = doc.objects[id];
    if (o) b = unionBounds(b, objectBounds(o));
  }
  return isEmptyBounds(b) ? null : b;
}

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

export function addObjects(doc: ProjectDoc, objs: GardenObject[]): void {
  for (const o of objs) {
    let layer = layerById(doc, o.layerId);
    if (!layer || layer.role === 'background') {
      layer = defaultLayerFor(doc, o.kind);
      o.layerId = layer.id;
    }
    doc.objects[o.id] = o;
    layer.objectIds.push(o.id);
  }
}

export function deleteObjects(doc: ProjectDoc, ids: readonly string[]): void {
  const set = new Set(ids);
  for (const l of doc.layers) l.objectIds = l.objectIds.filter((id) => !set.has(id));
  const removedPlantings = new Set<string>();
  for (const [pid, p] of Object.entries(doc.plantings)) {
    if (set.has(p.objectId)) {
      delete doc.plantings[pid];
      removedPlantings.add(pid);
    }
  }
  for (const key of Object.keys(doc.calendarOverrides)) {
    const owner = key.split(':')[0];
    if (removedPlantings.has(owner) || set.has(owner)) delete doc.calendarOverrides[key];
  }
  doc.rotationHistory = doc.rotationHistory.filter((r) => !set.has(r.objectId));
  for (const t of doc.customTasks) if (t.objectId && set.has(t.objectId)) t.objectId = null;
  const touchedGroups = new Set<string>();
  for (const id of ids) {
    const g = doc.objects[id]?.groupId;
    if (g) touchedGroups.add(g);
    delete doc.objects[id];
  }
  for (const g of touchedGroups) dissolveGroupIfSmall(doc, g);
}

function dissolveGroupIfSmall(doc: ProjectDoc, groupId: string): void {
  const members = Object.values(doc.objects).filter((o) => o.groupId === groupId);
  if (members.length < 2) {
    for (const m of members) m.groupId = null;
    delete doc.groups[groupId];
  }
}

export function moveObjects(doc: ProjectDoc, ids: readonly string[], dx: number, dy: number): void {
  for (const id of ids) {
    const o = doc.objects[id];
    if (!o) continue;
    o.transform.x += dx;
    o.transform.y += dy;
  }
}

export function updateObject(doc: ProjectDoc, id: string, patch: Partial<Omit<GardenObject, 'id'>>): void {
  const o = doc.objects[id];
  if (!o) return;
  if (patch.layerId && patch.layerId !== o.layerId) moveToLayer(doc, [id], patch.layerId);
  const { layerId: _l, props, style, ...rest } = patch;
  Object.assign(o, rest);
  if (props) o.props = { ...o.props, ...props };
  if (style) o.style = { ...o.style, ...style };
}

export function setObjectsProps(doc: ProjectDoc, ids: readonly string[], props: Partial<GardenObject['props']>): void {
  for (const id of ids) {
    const o = doc.objects[id];
    if (o) o.props = { ...o.props, ...props };
  }
}

export function changeKind(doc: ProjectDoc, ids: readonly string[], kind: ObjectKind): void {
  for (const id of ids) {
    const o = doc.objects[id];
    if (!o || o.kind === kind) continue;
    const oldInfo = kindInfo(o.kind);
    const info = kindInfo(kind);
    // Rename default names/codes so "Garden bed 3" does not stay on a lawn.
    if (o.name.startsWith(oldInfo.label)) o.name = o.name.replace(oldInfo.label, info.label);
    const renumber = new RegExp(`^${oldInfo.prefix}\\d+$`).test(o.code);
    o.kind = kind;
    if (renumber) o.code = nextCode(doc, kind);
    if (!info.plantable) {
      for (const [pid, p] of Object.entries(doc.plantings)) if (p.objectId === id) delete doc.plantings[pid];
    }
  }
}

export function setLocked(doc: ProjectDoc, ids: readonly string[], locked: boolean): void {
  for (const id of ids) if (doc.objects[id]) doc.objects[id].locked = locked;
}

export function setHidden(doc: ProjectDoc, ids: readonly string[], hidden: boolean): void {
  for (const id of ids) if (doc.objects[id]) doc.objects[id].hidden = hidden;
}

export type ZOrderOp = 'forward' | 'backward' | 'front' | 'back';

/** Changes stacking order within each object's layer. Preserves relative order of the moved set. */
export function reorderObjects(doc: ProjectDoc, ids: readonly string[], op: ZOrderOp): void {
  const set = new Set(ids);
  for (const layer of doc.layers) {
    const list = layer.objectIds;
    if (!list.some((id) => set.has(id))) continue;
    if (op === 'front' || op === 'back') {
      const moved = list.filter((id) => set.has(id));
      const rest = list.filter((id) => !set.has(id));
      layer.objectIds = op === 'front' ? [...rest, ...moved] : [...moved, ...rest];
    } else if (op === 'forward') {
      for (let i = list.length - 2; i >= 0; i--) {
        if (set.has(list[i]) && !set.has(list[i + 1])) [list[i], list[i + 1]] = [list[i + 1], list[i]];
      }
    } else {
      for (let i = 1; i < list.length; i++) {
        if (set.has(list[i]) && !set.has(list[i - 1])) [list[i], list[i - 1]] = [list[i - 1], list[i]];
      }
    }
  }
}

export function moveToLayer(doc: ProjectDoc, ids: readonly string[], layerId: string): void {
  const target = layerById(doc, layerId);
  if (!target || target.role === 'background') return;
  const set = new Set(ids);
  for (const l of doc.layers) if (l.id !== layerId) l.objectIds = l.objectIds.filter((id) => !set.has(id));
  for (const id of ids) {
    const o = doc.objects[id];
    if (!o) continue;
    if (!target.objectIds.includes(id)) target.objectIds.push(id);
    o.layerId = layerId;
  }
}

export function groupObjects(doc: ProjectDoc, ids: readonly string[], name?: string): string | null {
  const members = ids.filter((id) => doc.objects[id]);
  if (members.length < 2) return null;
  const old = new Set(members.map((id) => doc.objects[id].groupId).filter((g): g is string => !!g));
  const id = newId('grp');
  const n = Object.keys(doc.groups).length + 1;
  doc.groups[id] = { id, name: name ?? `Group ${n}` };
  for (const m of members) doc.objects[m].groupId = id;
  for (const g of old) dissolveGroupIfSmall(doc, g);
  return id;
}

export function ungroupObjects(doc: ProjectDoc, ids: readonly string[]): void {
  const groups = new Set(ids.map((id) => doc.objects[id]?.groupId).filter((g): g is string => !!g));
  for (const o of Object.values(doc.objects)) if (o.groupId && groups.has(o.groupId)) o.groupId = null;
  for (const g of groups) delete doc.groups[g];
}

export function rotateObjects(doc: ProjectDoc, ids: readonly string[], angle: number, center: Vec): void {
  for (const id of ids) {
    const o = doc.objects[id];
    if (!o) continue;
    const p = rotateAround({ x: o.transform.x, y: o.transform.y }, center, angle);
    o.transform.x = p.x;
    o.transform.y = p.y;
    o.transform.rotation = normalizeAngle(o.transform.rotation + angle);
  }
}

/**
 * Scales a multi-selection about an anchor in world axes. Objects rotated by
 * multiples of 90° are scaled on their matching local axes; other rotations
 * cannot be sheared, so they receive a uniform scale (the UI keeps aspect
 * ratio in that case).
 */
export function scaleObjects(doc: ProjectDoc, ids: readonly string[], sx: number, sy: number, anchor: Vec): void {
  for (const id of ids) {
    const o = doc.objects[id];
    if (!o) continue;
    o.transform.x = anchor.x + (o.transform.x - anchor.x) * sx;
    o.transform.y = anchor.y + (o.transform.y - anchor.y) * sy;
    const r = normalizeAngle(o.transform.rotation);
    const quarter = Math.round(r / 90);
    const aligned = Math.abs(r - quarter * 90) < 0.01;
    let lsx: number;
    let lsy: number;
    if (aligned) {
      [lsx, lsy] = quarter % 2 === 0 ? [sx, sy] : [sy, sx];
    } else {
      const s = Math.sqrt(Math.abs(sx * sy));
      lsx = s;
      lsy = s;
    }
    o.shape = scaleShape(o.shape, lsx, lsy);
    // Mirroring through negative scale is not supported; keep geometry positive.
    const rc = recenterShape(o.shape);
    o.shape = rc.shape;
    const off = rotate(rc.offset, o.transform.rotation);
    o.transform.x += off.x;
    o.transform.y += off.y;
  }
}

export type AlignOp = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

export function alignObjects(doc: ProjectDoc, ids: readonly string[], op: AlignOp): void {
  const sel = selectionBounds(doc, ids);
  if (!sel) return;
  for (const id of ids) {
    const o = doc.objects[id];
    if (!o) continue;
    const b = objectBounds(o);
    let dx = 0;
    let dy = 0;
    if (op === 'left') dx = sel.minX - b.minX;
    if (op === 'right') dx = sel.maxX - b.maxX;
    if (op === 'hcenter') dx = (sel.minX + sel.maxX) / 2 - (b.minX + b.maxX) / 2;
    if (op === 'top') dy = sel.minY - b.minY;
    if (op === 'bottom') dy = sel.maxY - b.maxY;
    if (op === 'vcenter') dy = (sel.minY + sel.maxY) / 2 - (b.minY + b.maxY) / 2;
    o.transform.x += dx;
    o.transform.y += dy;
  }
}

export function distributeObjects(doc: ProjectDoc, ids: readonly string[], axis: 'x' | 'y'): void {
  const objs = ids.map((id) => doc.objects[id]).filter(Boolean);
  if (objs.length < 3) return;
  const items = objs
    .map((o) => ({ o, b: objectBounds(o) }))
    .sort((a, b) => (axis === 'x' ? a.b.minX - b.b.minX : a.b.minY - b.b.minY));
  const size = (b: Bounds) => (axis === 'x' ? b.maxX - b.minX : b.maxY - b.minY);
  const start = axis === 'x' ? items[0].b.minX : items[0].b.minY;
  const end = axis === 'x' ? items[items.length - 1].b.maxX : items[items.length - 1].b.maxY;
  const total = items.reduce((s, it) => s + size(it.b), 0);
  const gap = (end - start - total) / (items.length - 1);
  let cursor = start;
  for (const it of items) {
    const cur = axis === 'x' ? it.b.minX : it.b.minY;
    const d = cursor - cur;
    if (axis === 'x') it.o.transform.x += d;
    else it.o.transform.y += d;
    cursor += size(it.b) + gap;
  }
}

// ---------------------------------------------------------------------------
// Clipboard / duplication
// ---------------------------------------------------------------------------

export const ClipboardSchema = z.object({
  format: z.literal('garden-toolkit-clipboard'),
  version: z.literal(1),
  objects: z.array(GardenObjectSchema).max(5000),
  plantings: z.array(PlantingSchema).default([]),
  groups: z.array(GroupSchema).default([]),
});
export type ClipboardPayload = z.infer<typeof ClipboardSchema>;

export function copySelection(doc: ProjectDoc, ids: readonly string[]): ClipboardPayload | null {
  // Preserve paint order so pasted objects stack the same way.
  const set = new Set(ids);
  const ordered: GardenObject[] = [];
  for (const l of doc.layers) for (const id of l.objectIds) if (set.has(id) && doc.objects[id]) ordered.push(doc.objects[id]);
  if (!ordered.length) return null;
  const groupIds = new Set(ordered.map((o) => o.groupId).filter((g): g is string => !!g));
  return structuredClone({
    format: 'garden-toolkit-clipboard' as const,
    version: 1 as const,
    objects: ordered,
    plantings: Object.values(doc.plantings).filter((p) => set.has(p.objectId)),
    groups: [...groupIds].map((g) => doc.groups[g]).filter((g): g is Group => !!g),
  });
}

/** Parses clipboard text defensively (it may come from anywhere). */
export function parseClipboardText(text: string): ClipboardPayload | null {
  if (!text || text.length > 20_000_000 || !text.includes('garden-toolkit-clipboard')) return null;
  try {
    const res = ClipboardSchema.safeParse(JSON.parse(text));
    return res.success ? res.data : null;
  } catch {
    return null;
  }
}

/** Inserts clipboard content with fresh ids, codes and groups. Returns new object ids. */
export function pasteObjects(doc: ProjectDoc, payload: ClipboardPayload, offset: Vec): string[] {
  const idMap = new Map<string, string>();
  const groupMap = new Map<string, string>();
  for (const g of payload.groups) {
    const id = newId('grp');
    groupMap.set(g.id, id);
    doc.groups[id] = { id, name: g.name };
  }
  const created: GardenObject[] = [];
  for (const src of payload.objects) {
    const id = newId('obj');
    idMap.set(src.id, id);
    const layer = layerById(doc, src.layerId);
    const o: GardenObject = {
      ...structuredClone(src),
      id,
      code: nextCodeAfter(doc, src.kind, created),
      layerId: layer && layer.role !== 'background' ? src.layerId : defaultLayerFor(doc, src.kind).id,
      groupId: src.groupId ? groupMap.get(src.groupId) ?? null : null,
      transform: { ...src.transform, x: src.transform.x + offset.x, y: src.transform.y + offset.y },
      locked: false,
    };
    created.push(o);
  }
  addObjects(doc, created);
  const now = new Date().toISOString();
  for (const p of payload.plantings) {
    const objectId = idMap.get(p.objectId);
    if (!objectId) continue;
    const id = newId('pl');
    doc.plantings[id] = { ...structuredClone(p), id, objectId, createdAt: now + p.createdAt.slice(-4) };
  }
  for (const g of groupMap.values()) dissolveGroupIfSmall(doc, g);
  return created.map((o) => o.id);
}

function nextCodeAfter(doc: ProjectDoc, kind: ObjectKind, pending: GardenObject[]): string {
  // nextCode only sees committed objects; account for ones created in this batch.
  const prefix = kindInfo(kind).prefix;
  let n = Number(nextCode(doc, kind).slice(prefix.length));
  for (const o of pending) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(o.code);
    if (m) n = Math.max(n, Number(m[1]) + 1);
  }
  return `${prefix}${n}`;
}

export function duplicateObjects(doc: ProjectDoc, ids: readonly string[], offset: Vec): string[] {
  const payload = copySelection(doc, ids);
  return payload ? pasteObjects(doc, payload, offset) : [];
}

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

export function addLayer(doc: ProjectDoc, name: string): string {
  const id = newId('layer');
  doc.layers.push({ id, name, role: 'content', visible: true, locked: false, objectIds: [] });
  return id;
}

export function updateLayer(doc: ProjectDoc, id: string, patch: Partial<Pick<Layer, 'name' | 'visible' | 'locked'>>): void {
  const l = layerById(doc, id);
  if (l) Object.assign(l, patch);
}

/** Deletes a layer; its objects move to `moveTo` (or the nearest content layer). */
export function deleteLayer(doc: ProjectDoc, id: string, moveTo?: string): boolean {
  const layer = layerById(doc, id);
  if (!layer || layer.role === 'background') return false;
  const content = doc.layers.filter((l) => l.role === 'content' && l.id !== id);
  if (!content.length) return false;
  const target = (moveTo && content.find((l) => l.id === moveTo)) || content[content.length - 1];
  for (const oid of layer.objectIds) if (doc.objects[oid]) doc.objects[oid].layerId = target.id;
  target.objectIds.push(...layer.objectIds);
  doc.layers = doc.layers.filter((l) => l.id !== id);
  return true;
}

/** Moves a layer up (towards the top of the stack) or down. Background stays at the bottom. */
export function moveLayer(doc: ProjectDoc, id: string, dir: 'up' | 'down'): void {
  const i = doc.layers.findIndex((l) => l.id === id);
  if (i < 0 || doc.layers[i].role === 'background') return;
  const j = dir === 'up' ? i + 1 : i - 1;
  if (j < 0 || j >= doc.layers.length || doc.layers[j].role === 'background') return;
  [doc.layers[i], doc.layers[j]] = [doc.layers[j], doc.layers[i]];
}

// ---------------------------------------------------------------------------
// Plantings
// ---------------------------------------------------------------------------

export function assignPlant(
  doc: ProjectDoc,
  objectIds: readonly string[],
  plantId: string,
  opts: { season?: number; variety?: string } = {},
): string[] {
  const out: string[] = [];
  const season = opts.season ?? doc.settings.activeSeason;
  const base = Date.now();
  objectIds.forEach((objectId, i) => {
    const o = doc.objects[objectId];
    if (!o || !kindInfo(o.kind).plantable) return;
    const id = newId('pl');
    doc.plantings[id] = {
      id,
      plantId,
      objectId,
      season,
      variety: opts.variety ?? '',
      method: null,
      areaShare: null,
      spacing: {},
      quantityOverride: null,
      seedQuantityOverride: null,
      yieldOverride: null,
      dates: {},
      status: 'planned',
      notes: '',
      // Monotonic timestamps keep creation order stable for area splitting.
      createdAt: new Date(base + i).toISOString(),
    };
    out.push(id);
  });
  return out;
}

export function updatePlanting(doc: ProjectDoc, id: string, patch: Partial<Omit<Planting, 'id'>>): void {
  const p = doc.plantings[id];
  if (!p) return;
  const { spacing, dates, ...rest } = patch;
  Object.assign(p, rest);
  if (spacing) p.spacing = { ...p.spacing, ...spacing };
  if (dates) p.dates = { ...p.dates, ...dates };
}

export function removePlantings(doc: ProjectDoc, ids: readonly string[]): void {
  for (const id of ids) {
    delete doc.plantings[id];
    for (const key of Object.keys(doc.calendarOverrides)) if (key.startsWith(`${id}:`)) delete doc.calendarOverrides[key];
  }
}

// ---------------------------------------------------------------------------
// Background images & calibration
// ---------------------------------------------------------------------------

export function addBackground(doc: ProjectDoc, bg: BackgroundImage): void {
  doc.backgrounds.push(bg);
}

export function updateBackground(doc: ProjectDoc, id: string, patch: Partial<Omit<BackgroundImage, 'id'>>): void {
  const bg = doc.backgrounds.find((b) => b.id === id);
  if (bg) Object.assign(bg, patch);
}

export function removeBackground(doc: ProjectDoc, id: string): void {
  doc.backgrounds = doc.backgrounds.filter((b) => b.id !== id);
}

/** World point → image pixel coordinates of a background image. */
export function worldToImagePx(bg: BackgroundImage, p: Vec): Vec {
  const local = rotate(sub(p, { x: bg.transform.x, y: bg.transform.y }), -bg.transform.rotation);
  return { x: local.x / bg.mmPerPx + bg.naturalWidth / 2, y: local.y / bg.mmPerPx + bg.naturalHeight / 2 };
}

export function imagePxToWorld(bg: BackgroundImage, px: Vec): Vec {
  const local = { x: (px.x - bg.naturalWidth / 2) * bg.mmPerPx, y: (px.y - bg.naturalHeight / 2) * bg.mmPerPx };
  return add(rotate(local, bg.transform.rotation), { x: bg.transform.x, y: bg.transform.y });
}

/**
 * Calibrates a background: two world points that lie on the image are
 * declared to be `distanceMm` apart. The image is scaled about point `a` so
 * `a` stays put. Optionally existing objects are scaled by the same factor
 * about the same point (for plans drawn before calibration).
 */
export function calibrateBackground(
  doc: ProjectDoc,
  bgId: string,
  a: Vec,
  b: Vec,
  distanceMm: number,
  opts: { scaleObjects?: boolean; now?: Date } = {},
): number | null {
  const bg = doc.backgrounds.find((x) => x.id === bgId);
  const measured = Math.hypot(b.x - a.x, b.y - a.y);
  if (!bg || measured <= 0 || !(distanceMm > 0)) return null;
  const f = distanceMm / measured;
  const pxA = worldToImagePx(bg, a);
  const pxB = worldToImagePx(bg, b);
  bg.mmPerPx *= f;
  bg.transform.x = a.x + (bg.transform.x - a.x) * f;
  bg.transform.y = a.y + (bg.transform.y - a.y) * f;
  bg.calibration = { a: pxA, b: pxB, distanceMm, calibratedAt: (opts.now ?? new Date()).toISOString() };
  if (opts.scaleObjects) {
    const ids = Object.keys(doc.objects);
    scaleObjects(doc, ids, f, f, a);
  }
  return f;
}

/** Bounds of all visible content (objects + backgrounds) for "fit to screen". */
export function contentBounds(doc: ProjectDoc): Bounds | null {
  let b = emptyBounds();
  for (const o of Object.values(doc.objects)) if (!o.hidden) b = unionBounds(b, objectBounds(o));
  for (const bg of doc.backgrounds) {
    if (!bg.visible) continue;
    const c = bg.crop ?? { x: 0, y: 0, width: bg.naturalWidth, height: bg.naturalHeight };
    const corners = [
      { x: c.x, y: c.y },
      { x: c.x + c.width, y: c.y },
      { x: c.x + c.width, y: c.y + c.height },
      { x: c.x, y: c.y + c.height },
    ].map((p) => imagePxToWorld(bg, p));
    b = unionBounds(b, boundsOfPoints(corners));
  }
  return isEmptyBounds(b) ? null : b;
}

export function centerOf(b: Bounds): Vec {
  return boundsCenter(b);
}
