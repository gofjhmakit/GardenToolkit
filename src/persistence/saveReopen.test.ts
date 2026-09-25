// @vitest-environment node
/**
 * The contract users rely on most: whatever the editor lets you enter is saved
 * and the project opens again. Stored documents are validated on load, so any
 * value the UI accepts but the schema rejects would lock the user out of the
 * project.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createProject, makeObject } from '../domain/projectFactory';
import { addLayer, addObjects, assignPlant, copySelection, pasteObjects, updateLayer } from '../editor/commands';
import { loadCoreCatalog } from '../test/fixtures';
import { openDatabase, setDb } from './db';
import { assetsForProject, createSnapshot, deleteProject, duplicateProject, listProjects, listSnapshots, loadProject, pruneAssets, putAsset, saveProject, storeImportedProject } from './projectRepo';
import { buildProjectPackage, importProjectFile } from './projectPackage';

const catalog = loadCoreCatalog();
const known = (id: string) => catalog.plants.has(id);

beforeEach(() => {
  setDb(openDatabase(`save-reopen-${Math.random()}`));
});

async function reopen(id: string) {
  const res = await loadProject(id);
  if (!res?.ok) throw new Error(`project did not reopen: ${res ? `${res.error} ${res.details.join('; ')}` : 'missing'}`);
  return res.doc;
}

describe('save → reopen contract', () => {
  it('reopens a project filled to every text limit the UI allows', async () => {
    const doc = createProject('x'.repeat(200));
    doc.meta.description = 'd'.repeat(5000);
    doc.location = { ...doc.location, country: 'c'.repeat(80), region: 'r'.repeat(120), climateZone: 'z'.repeat(20), frostDateSource: 's'.repeat(300) };
    const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 1000, height: 1000 }, { name: 'n'.repeat(200), code: 'C'.repeat(20), props: { notes: 'n'.repeat(20000), material: 'm'.repeat(200) } });
    addObjects(doc, [bed]);
    const [pid] = assignPlant(doc, [bed.id], 'allium-cepa');
    doc.plantings[pid].variety = 'v'.repeat(200);
    doc.plantings[pid].notes = 'p'.repeat(20000);
    doc.customTasks.push({ id: 't', title: 't'.repeat(300), start: '2026-05-01', end: null, objectId: null, notes: '', done: false });
    doc.notes.push({ id: 'n', title: 't'.repeat(300), body: 'b'.repeat(50000), createdAt: 'c', updatedAt: 'u' });
    doc.rotationHistory.push({ id: 'r', objectId: bed.id, season: 2025, group: 'legumes', crop: 'c'.repeat(200) });
    await saveProject(doc);
    expect(await reopen(doc.id)).toEqual(doc);
  });

  it('clamps layer names to the stored limit, whichever way they are set', async () => {
    const doc = createProject('Layers');
    const id = addLayer(doc, 'L'.repeat(150));
    expect(doc.layers.find((l) => l.id === id)!.name).toHaveLength(100);
    updateLayer(doc, id, { name: 'M'.repeat(150) });
    expect(doc.layers.find((l) => l.id === id)!.name).toHaveLength(100);
    await saveProject(doc);
    await reopen(doc.id);
  });

  it('"Save as" of a project with a maximum-length name still reopens', async () => {
    const doc = createProject('x'.repeat(200));
    await saveProject(doc);
    const copy = await duplicateProject(doc, `${doc.meta.name} (copy)`);
    expect((await reopen(copy.id)).meta.name).toHaveLength(200);
  });

  it('keeps plantings valid after copy and paste (fresh ids, valid timestamps)', async () => {
    const doc = createProject('Paste');
    const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 2000, height: 1000 });
    addObjects(doc, [bed]);
    assignPlant(doc, [bed.id], 'allium-cepa');
    const [newId] = pasteObjects(doc, copySelection(doc, [bed.id])!, { x: 100, y: 100 });
    const pasted = Object.values(doc.plantings).find((p) => p.objectId === newId)!;
    expect(Number.isNaN(Date.parse(pasted.createdAt))).toBe(false);
    expect(new Date(pasted.createdAt).toISOString()).toBe(pasted.createdAt);
    await saveProject(doc);
    await reopen(doc.id);
  });
});

describe('project lifecycle as a user sees it', () => {
  it('importing the same file twice gives two independent projects', async () => {
    const doc = createProject('Shared plan');
    const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 1000, height: 1000 });
    addObjects(doc, [bed]);
    const pkg = await buildProjectPackage(doc, [], (id) => catalog.get(id));
    const a = await importProjectFile(pkg, known);
    const b = await importProjectFile(pkg, known);
    if (!a.ok || !b.ok) throw new Error('import failed');
    await storeImportedProject(a.doc, a.assets);
    await storeImportedProject(b.doc, b.assets);
    expect(a.doc.id).not.toBe(b.doc.id);
    expect(a.doc.id).not.toBe(doc.id);
    expect((await listProjects()).map((p) => p.name)).toEqual(['Shared plan', 'Shared plan']);
    // Editing one copy leaves the other untouched.
    await saveProject({ ...a.doc, meta: { ...a.doc.meta, name: 'Edited' } });
    expect((await reopen(b.doc.id)).meta.name).toBe('Shared plan');
  });

  it('deleting a project also deletes its version history', async () => {
    const doc = createProject('Temporary');
    await saveProject(doc);
    await createSnapshot(doc, 'Manual', false);
    await createSnapshot(doc, 'Auto', true);
    const other = createProject('Keep me');
    await saveProject(other);
    await createSnapshot(other, 'Manual', false);
    await deleteProject(doc.id);
    expect(await listSnapshots(doc.id)).toEqual([]);
    expect(await listSnapshots(other.id)).toHaveLength(1);
    expect(await loadProject(doc.id)).toBeNull();
  });
});

describe('freeing space from removed blueprint images', () => {
  const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])], { type: 'image/png' });
  const asset = (id: string, projectId: string, createdAt: string) => ({ id, projectId, name: `${id}.png`, mimeType: 'image/png', byteSize: 8, width: 1, height: 1, blob: png, createdAt });
  const background = (id: string, assetId: string) => ({ id, assetId, name: 'plan', transform: { x: 0, y: 0, rotation: 0 }, mmPerPx: 1, naturalWidth: 1, naturalHeight: 1, crop: null, opacity: 1, visible: true, locked: true, calibration: null });

  it('deletes only images that no saved state references and that are old enough', async () => {
    const doc = createProject('Blueprints');
    const old = '2026-01-01T00:00:00.000Z';
    doc.backgrounds.push(background('bg-current', 'in-use'));
    await saveProject(doc);
    // A version snapshot still shows an older blueprint, so its image must stay restorable.
    await createSnapshot({ ...doc, backgrounds: [background('bg-old', 'in-snapshot')] }, 'Before', false);
    for (const id of ['in-use', 'in-snapshot', 'orphan']) await putAsset(asset(id, doc.id, old));
    await putAsset(asset('just-imported', doc.id, '2026-06-01T11:59:00.000Z'));
    const other = createProject('Other');
    await saveProject(other);
    await putAsset(asset('other-orphan', other.id, old));

    const removed = await pruneAssets(doc.id, { minAgeMs: 10 * 60 * 1000, now: new Date('2026-06-01T12:00:00Z') });
    expect(removed).toBe(1);
    expect((await assetsForProject(doc.id)).map((a) => a.id).sort()).toEqual(['in-snapshot', 'in-use', 'just-imported']);
    // Other projects are never touched.
    expect(await assetsForProject(other.id)).toHaveLength(1);
  });

  it('does nothing for a project that is not stored', async () => {
    await putAsset(asset('x', 'prj_missing', '2020-01-01T00:00:00.000Z'));
    expect(await pruneAssets('prj_missing')).toBe(0);
    expect(await assetsForProject('prj_missing')).toHaveLength(1);
  });
});
