import { describe, expect, it } from 'vitest';
import { createProject, makeObject, isObjectLocked, isObjectVisible, nextCode, defaultLayerFor, plantingsForObject } from '../domain/projectFactory';
import type { ProjectDoc } from '../domain/project';
import {
  addLayer,
  addObjects,
  assignPlant,
  changeKind,
  contentBounds,
  deleteLayer,
  distributeObjects,
  expandToGroups,
  moveLayer,
  moveToLayer,
  removePlantings,
  selectionBounds,
  setHidden,
  setLocked,
  updateLayer,
  updateObject,
  updatePlanting,
  worldToImagePx,
  imagePxToWorld,
  calibrateBackground,
  addBackground,
  removeBackground,
  updateBackground,
} from './commands';

function setup(n = 3) {
  const doc = createProject('cmd');
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const o = makeObject(doc, 'bed', { x: i * 3000, y: 0, rotation: 0 }, { type: 'rect', width: 1000, height: 1000 });
    addObjects(doc, [o]);
    ids.push(o.id);
  }
  return { doc, ids };
}

describe('more commands', () => {
  it('assigns default layers by kind and puts objects never on the background layer', () => {
    const doc = createProject('x');
    expect(defaultLayerFor(doc, 'tree').id).toBe('layer-trees');
    expect(defaultLayerFor(doc, 'path').id).toBe('layer-paths');
    const o = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 1, height: 1 }, { layerId: 'layer-background' });
    addObjects(doc, [o]);
    expect(doc.objects[o.id].layerId).toBe('layer-beds');
  });
  it('generates sequential plan codes per kind', () => {
    const { doc } = setup(2);
    expect(nextCode(doc, 'bed')).toBe('B3');
    expect(nextCode(doc, 'tree')).toBe('T1');
  });
  it('respects layer visibility and lock for objects', () => {
    const { doc, ids } = setup(1);
    const o = doc.objects[ids[0]];
    updateLayer(doc, 'layer-beds', { visible: false, locked: true });
    expect(isObjectVisible(doc, o)).toBe(false);
    expect(isObjectLocked(doc, o)).toBe(true);
    updateLayer(doc, 'layer-beds', { visible: true, locked: false });
    setLocked(doc, ids, true);
    setHidden(doc, ids, true);
    expect(isObjectLocked(doc, doc.objects[ids[0]])).toBe(true);
    expect(isObjectVisible(doc, doc.objects[ids[0]])).toBe(false);
  });
  it('moves objects between layers but never into the background layer', () => {
    const { doc, ids } = setup(2);
    const L = addLayer(doc, 'Veg');
    moveToLayer(doc, [ids[0]], L);
    expect(doc.objects[ids[0]].layerId).toBe(L);
    expect(doc.layers.find((l) => l.id === L)!.objectIds).toEqual([ids[0]]);
    expect(doc.layers.find((l) => l.id === 'layer-beds')!.objectIds).toEqual([ids[1]]);
    moveToLayer(doc, [ids[1]], 'layer-background');
    expect(doc.objects[ids[1]].layerId).toBe('layer-beds');
    updateObject(doc, ids[1], { layerId: L, name: 'Renamed', props: { soil: 'clay' } });
    expect(doc.objects[ids[1]]).toMatchObject({ layerId: L, name: 'Renamed' });
    expect(doc.objects[ids[1]].props.soil).toBe('clay');
  });
  it('cannot delete the background layer or the last content layer', () => {
    const doc = createProject('x');
    expect(deleteLayer(doc, 'layer-background')).toBe(false);
    for (const l of doc.layers.filter((l) => l.role === 'content').slice(0, -1)) expect(deleteLayer(doc, l.id)).toBe(true);
    const last = doc.layers.find((l) => l.role === 'content')!;
    expect(deleteLayer(doc, last.id)).toBe(false);
    moveLayer(doc, 'nope', 'up');
    moveLayer(doc, 'layer-background', 'up');
    expect(doc.layers[0].role).toBe('background');
  });
  it('changing kind renames defaults, renumbers codes and drops plantings for non-plantable kinds', () => {
    const { doc, ids } = setup(1);
    assignPlant(doc, ids, 'daucus-carota-sativus');
    changeKind(doc, ids, 'raised-bed');
    expect(doc.objects[ids[0]]).toMatchObject({ kind: 'raised-bed', code: 'RB1' });
    expect(doc.objects[ids[0]].name.startsWith('Raised bed')).toBe(true);
    expect(plantingsForObject(doc, ids[0])).toHaveLength(1);
    changeKind(doc, ids, 'lawn');
    expect(plantingsForObject(doc, ids[0])).toHaveLength(0);
    // Custom names and codes are kept.
    doc.objects[ids[0]].name = 'Front lawn';
    doc.objects[ids[0]].code = 'X9';
    changeKind(doc, ids, 'gravel');
    expect(doc.objects[ids[0]]).toMatchObject({ name: 'Front lawn', code: 'X9' });
  });
  it('does not plant into non-plantable objects', () => {
    const doc = createProject('x');
    const lawn = makeObject(doc, 'lawn', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 1, height: 1 });
    addObjects(doc, [lawn]);
    expect(assignPlant(doc, [lawn.id, 'missing'], 'daucus-carota-sativus')).toEqual([]);
  });
  it('updates and removes plantings with their calendar overrides', () => {
    const { doc, ids } = setup(1);
    const [p] = assignPlant(doc, ids, 'daucus-carota-sativus', { variety: 'Nantes' });
    expect(doc.plantings[p].variety).toBe('Nantes');
    updatePlanting(doc, p, { spacing: { inRowMm: 50 }, dates: { directSow: '2026-05-01' } });
    updatePlanting(doc, p, { spacing: { rowMm: 200 } });
    expect(doc.plantings[p].spacing).toEqual({ inRowMm: 50, rowMm: 200 });
    doc.calendarOverrides[`${p}:direct-sow`] = { done: true };
    removePlantings(doc, [p]);
    expect(doc.plantings[p]).toBeUndefined();
    expect(Object.keys(doc.calendarOverrides)).toHaveLength(0);
    updatePlanting(doc, 'missing', { notes: 'x' }); // no-op
  });
  it('distributes objects evenly', () => {
    const { doc, ids } = setup(3);
    doc.objects[ids[1]].transform.x = 1500;
    distributeObjects(doc, ids, 'x');
    expect(doc.objects[ids[1]].transform.x).toBe(3000);
    distributeObjects(doc, ids.slice(0, 2), 'x'); // needs ≥3: no-op
  });
  it('computes selection and content bounds, and group expansion', () => {
    const { doc, ids } = setup(2);
    expect(selectionBounds(doc, ids)).toEqual({ minX: -500, minY: -500, maxX: 3500, maxY: 500 });
    expect(selectionBounds(doc, [])).toBeNull();
    doc.objects[ids[1]].hidden = true;
    expect(contentBounds(doc)).toEqual({ minX: -500, minY: -500, maxX: 500, maxY: 500 });
    expect(contentBounds(createProject('empty'))).toBeNull();
    expect(expandToGroups(doc, ['missing', ids[0]])).toEqual([ids[0]]);
  });
  it('round-trips image/world coordinates for rotated, scaled backgrounds', () => {
    const doc: ProjectDoc = createProject('bg');
    addBackground(doc, {
      id: 'bg', assetId: 'a', name: 'x', transform: { x: 1234, y: -567, rotation: 33 }, mmPerPx: 7.5,
      naturalWidth: 640, naturalHeight: 480, crop: { x: 10, y: 10, width: 100, height: 100 }, opacity: 1, visible: true, locked: false, calibration: null,
    });
    const bg = doc.backgrounds[0];
    const px = { x: 123, y: 456 };
    const back = worldToImagePx(bg, imagePxToWorld(bg, px));
    expect(back.x).toBeCloseTo(px.x);
    expect(back.y).toBeCloseTo(px.y);
    const cb = contentBounds(doc)!;
    expect(cb.maxX - cb.minX).toBeGreaterThan(0);
    expect(calibrateBackground(doc, 'bg', { x: 0, y: 0 }, { x: 0, y: 0 }, 100)).toBeNull();
    expect(calibrateBackground(doc, 'missing', { x: 0, y: 0 }, { x: 1, y: 0 }, 100)).toBeNull();
    expect(calibrateBackground(doc, 'bg', { x: 0, y: 0 }, { x: 100, y: 0 }, 0)).toBeNull();
    updateBackground(doc, 'bg', { opacity: 0.3 });
    expect(doc.backgrounds[0].opacity).toBe(0.3);
    removeBackground(doc, 'bg');
    expect(doc.backgrounds).toHaveLength(0);
  });
});
