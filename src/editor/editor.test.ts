import { beforeEach, describe, expect, it } from 'vitest';
import { createProject, makeObject, objectsInPaintOrder } from '../domain/projectFactory';
import type { ProjectDoc } from '../domain/project';
import {
  addObjects,
  alignObjects,
  assignPlant,
  calibrateBackground,
  copySelection,
  deleteObjects,
  duplicateObjects,
  groupObjects,
  imagePxToWorld,
  parseClipboardText,
  pasteObjects,
  reorderObjects,
  rotateObjects,
  scaleObjects,
  ungroupObjects,
  deleteLayer,
  moveLayer,
} from './commands';
import { useEditor } from './store';

function bed(doc: ProjectDoc, x: number, y: number, w = 3000, h = 1200) {
  return makeObject(doc, 'bed', { x, y, rotation: 0 }, { type: 'rect', width: w, height: h });
}

function setupDoc() {
  const doc = createProject('Editor test');
  const a = bed(doc, 0, 0);
  addObjects(doc, [a]);
  const b = bed(doc, 5000, 0);
  addObjects(doc, [b]);
  const c = bed(doc, 10000, 0);
  addObjects(doc, [c]);
  return { doc, a: a.id, b: b.id, c: c.id };
}

describe('commands', () => {
  it('creates objects with codes on the kind default layer', () => {
    const { doc, a, b } = setupDoc();
    expect(doc.objects[a].code).toBe('B1');
    expect(doc.objects[b].code).toBe('B2');
    expect(doc.layers.find((l) => l.id === 'layer-beds')!.objectIds).toEqual(expect.arrayContaining([a, b]));
  });

  it('deletes objects together with their plantings and calendar overrides', () => {
    const { doc, a } = setupDoc();
    const [pid] = assignPlant(doc, [a], 'daucus-carota-sativus');
    doc.calendarOverrides[`${pid}:direct-sow`] = { done: true };
    deleteObjects(doc, [a]);
    expect(doc.objects[a]).toBeUndefined();
    expect(doc.plantings[pid]).toBeUndefined();
    expect(doc.calendarOverrides[`${pid}:direct-sow`]).toBeUndefined();
    expect(doc.layers.some((l) => l.objectIds.includes(a))).toBe(false);
  });

  it('assigns one plant to many beds as separate project plantings', () => {
    const { doc, a, b, c } = setupDoc();
    const ids = assignPlant(doc, [a, b, c], 'daucus-carota-sativus');
    expect(ids).toHaveLength(3);
    expect(new Set(ids.map((id) => doc.plantings[id].objectId))).toEqual(new Set([a, b, c]));
  });

  it('copies and pastes objects with plantings, fresh ids and codes', () => {
    const { doc, a, b } = setupDoc();
    assignPlant(doc, [a], 'daucus-carota-sativus');
    const payload = copySelection(doc, [a, b])!;
    const text = JSON.stringify(payload);
    const parsed = parseClipboardText(text)!;
    expect(parsed.objects).toHaveLength(2);
    const pasted = pasteObjects(doc, parsed, { x: 500, y: 500 });
    expect(pasted).toHaveLength(2);
    expect(pasted).not.toContain(a);
    expect(doc.objects[pasted[0]].transform.x).toBe(500);
    expect(new Set(Object.values(doc.objects).map((o) => o.code)).size).toBe(5);
    expect(Object.values(doc.plantings).filter((p) => p.objectId === pasted[0])).toHaveLength(1);
  });

  it('rejects malformed clipboard data', () => {
    expect(parseClipboardText('{"format":"garden-toolkit-clipboard","version":1,"objects":[{"id":1}]}')).toBeNull();
    expect(parseClipboardText('hello')).toBeNull();
    expect(parseClipboardText('{broken garden-toolkit-clipboard')).toBeNull();
  });

  it('duplicates groups as new groups', () => {
    const { doc, a, b } = setupDoc();
    const g = groupObjects(doc, [a, b])!;
    const dup = duplicateObjects(doc, [a, b], { x: 0, y: 3000 });
    const g2 = doc.objects[dup[0]].groupId;
    expect(g2).toBeTruthy();
    expect(g2).not.toBe(g);
    expect(doc.objects[dup[1]].groupId).toBe(g2);
  });

  it('groups and ungroups', () => {
    const { doc, a, b } = setupDoc();
    const g = groupObjects(doc, [a, b])!;
    expect(doc.groups[g]).toBeDefined();
    ungroupObjects(doc, [a]);
    expect(doc.objects[a].groupId).toBeNull();
    expect(doc.objects[b].groupId).toBeNull();
    expect(doc.groups[g]).toBeUndefined();
    // Groups with fewer than two members dissolve on delete.
    const g3 = groupObjects(doc, [a, b])!;
    deleteObjects(doc, [a]);
    expect(doc.groups[g3]).toBeUndefined();
    expect(doc.objects[b].groupId).toBeNull();
  });

  it('reorders within the layer', () => {
    const { doc, a, b, c } = setupDoc();
    const layer = () => doc.layers.find((l) => l.id === 'layer-beds')!.objectIds;
    reorderObjects(doc, [a], 'front');
    expect(layer()).toEqual([b, c, a]);
    reorderObjects(doc, [a], 'backward');
    expect(layer()).toEqual([b, a, c]);
    reorderObjects(doc, [c], 'back');
    expect(layer()).toEqual([c, b, a]);
    reorderObjects(doc, [c], 'forward');
    expect(layer()).toEqual([b, c, a]);
  });

  it('rotates and scales multi-selections about a pivot', () => {
    const { doc, a, b } = setupDoc();
    rotateObjects(doc, [a, b], 90, { x: 0, y: 0 });
    expect(doc.objects[b].transform.x).toBeCloseTo(0);
    expect(doc.objects[b].transform.y).toBeCloseTo(5000);
    expect(doc.objects[b].transform.rotation).toBe(90);
    scaleObjects(doc, [a, b], 2, 1, { x: 0, y: 0 });
    // Rotated 90°: world x-scale applies to the local height.
    const sb = doc.objects[b].shape;
    expect(sb.type === 'rect' && sb.height).toBe(2400);
    expect(sb.type === 'rect' && sb.width).toBe(3000);
  });

  it('aligns objects', () => {
    const { doc, a, b } = setupDoc();
    doc.objects[b].transform.y = 700;
    alignObjects(doc, [a, b], 'top');
    expect(doc.objects[b].transform.y).toBe(0);
  });

  it('moves layers and deletes layers without losing objects', () => {
    const { doc, a } = setupDoc();
    const before = doc.layers.map((l) => l.id);
    moveLayer(doc, 'layer-beds', 'up');
    expect(doc.layers.map((l) => l.id)).not.toEqual(before);
    moveLayer(doc, 'layer-ground', 'down'); // cannot go below background
    expect(doc.layers[0].role).toBe('background');
    expect(deleteLayer(doc, 'layer-beds')).toBe(true);
    expect(doc.objects[a]).toBeDefined();
    expect(objectsInPaintOrder(doc).map((o) => o.id)).toContain(a);
  });

  it('calibrates a background image and optionally rescales objects', () => {
    const { doc, b } = setupDoc();
    doc.backgrounds.push({
      id: 'bg', assetId: 'x', name: 'plan', transform: { x: 0, y: 0, rotation: 0 }, mmPerPx: 10,
      naturalWidth: 1000, naturalHeight: 800, crop: null, opacity: 1, visible: true, locked: true, calibration: null,
    });
    // Two points 200 px apart on the image are 2000 mm apart under the 10 mm/px assumption.
    const p1 = imagePxToWorld(doc.backgrounds[0], { x: 100, y: 100 });
    const p2 = imagePxToWorld(doc.backgrounds[0], { x: 300, y: 100 });
    const f = calibrateBackground(doc, 'bg', p1, p2, 10000, { scaleObjects: true });
    expect(f).toBe(5);
    expect(doc.backgrounds[0].mmPerPx).toBe(50);
    // The first reference point stays fixed.
    const again = imagePxToWorld(doc.backgrounds[0], { x: 100, y: 100 });
    expect(again.x).toBeCloseTo(p1.x);
    expect(again.y).toBeCloseTo(p1.y);
    const q = imagePxToWorld(doc.backgrounds[0], { x: 300, y: 100 });
    expect(Math.hypot(q.x - again.x, q.y - again.y)).toBeCloseTo(10000);
    const s = doc.objects[b].shape;
    expect(s.type === 'rect' && s.width).toBeCloseTo(15000);
    expect(doc.backgrounds[0].calibration?.distanceMm).toBe(10000);
  });
});

describe('editor store', () => {
  beforeEach(() => {
    const { doc } = setupDoc();
    useEditor.getState().open(doc);
  });

  it('supports undo/redo of commits and restores selection', () => {
    const s = useEditor.getState;
    const id = Object.keys(s().doc!.objects)[0];
    s().setSelection([id]);
    s().commit('Rename', (d) => {
      d.objects[id].name = 'Carrot bed';
    });
    expect(s().doc!.objects[id].name).toBe('Carrot bed');
    s().undo();
    expect(s().doc!.objects[id].name).not.toBe('Carrot bed');
    expect(s().selection).toEqual([id]);
    s().redo();
    expect(s().doc!.objects[id].name).toBe('Carrot bed');
  });

  it('coalesces rapid edits with the same key into one undo step', () => {
    const s = useEditor.getState;
    const id = Object.keys(s().doc!.objects)[0];
    for (const n of ['C', 'Ca', 'Car']) s().commit('Rename', (d) => void (d.objects[id].name = n), { coalesceKey: `name:${id}` });
    expect(s().past).toHaveLength(1);
    s().undo();
    expect(s().doc!.objects[id].name).toBe('Garden bed 1');
  });

  it('records a whole drag gesture as a single undo step', () => {
    const s = useEditor.getState;
    const id = Object.keys(s().doc!.objects)[0];
    s().beginGesture();
    for (let i = 1; i <= 10; i++) s().updateGesture((d) => void (d.objects[id].transform.x = i * 100));
    s().endGesture('Move');
    expect(s().doc!.objects[id].transform.x).toBe(1000);
    expect(s().past).toHaveLength(1);
    s().undo();
    expect(s().doc!.objects[id].transform.x).toBe(0);
  });

  it('selects whole groups, and supports add/toggle multi-selection', () => {
    const s = useEditor.getState;
    const [a, b, c] = Object.keys(s().doc!.objects);
    s().commit('Group', (d) => void groupObjects(d, [a, b]));
    s().setSelection([a]);
    expect(new Set(s().selection)).toEqual(new Set([a, b]));
    s().setSelection([c], 'add');
    expect(s().selection).toHaveLength(3);
    s().setSelection([c], 'toggle');
    expect(s().selection).toHaveLength(2);
  });

  it('keeps zoom independent of stored dimensions', () => {
    const s = useEditor.getState;
    const id = Object.keys(s().doc!.objects)[0];
    const before = structuredClone(s().doc!.objects[id]);
    s().zoomAt(4, { x: 100, y: 100 });
    s().zoomAt(0.1, { x: 10, y: 10 });
    expect(s().doc!.objects[id]).toEqual(before);
  });
});
