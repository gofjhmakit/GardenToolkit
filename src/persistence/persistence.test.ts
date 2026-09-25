// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { createProject, makeObject } from '../domain/projectFactory';
import { addObjects, assignPlant } from '../editor/commands';
import { loadCoreCatalog } from '../test/fixtures';
import { openDatabase, setDb, type AssetRecord } from './db';
import {
  createSnapshot,
  deleteProject,
  duplicateProject,
  listProjects,
  listSnapshots,
  loadProject,
  saveProject,
  storeImportedProject,
  assetsForProject,
  MAX_AUTO_SNAPSHOTS,
} from './projectRepo';
import { buildProjectJson, buildProjectPackage, importProjectFile } from './projectPackage';
import { migrateRawDoc, parseStoredDoc } from './migrations';

const catalog = loadCoreCatalog();
const lookup = (id: string) => catalog.get(id);
const known = (id: string) => catalog.plants.has(id);

// 1×1 transparent PNG
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);

function sampleProject() {
  const doc = createProject('My Garden', { location: { country: 'Finland', lastFrost: '05-20', firstFrost: '09-25', climateSystem: 'finnish-zone', climateZone: 'II' } });
  const bed = makeObject(doc, 'raised-bed', { x: 1000, y: 2000, rotation: 15 }, { type: 'rect', width: 3000, height: 1200 }, { props: { sunLevel: 'full-sun', heightMm: 300 } });
  const lawn = makeObject(doc, 'lawn', { x: 0, y: 0, rotation: 0 }, { type: 'polygon', points: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 2500, y: 4000 }] });
  addObjects(doc, [bed, lawn]);
  assignPlant(doc, [bed.id], 'daucus-carota-sativus');
  const [p2] = assignPlant(doc, [bed.id], 'solanum-lycopersicum');
  doc.plantings[p2].quantityOverride = 6;
  doc.backgrounds.push({
    id: 'bg1', assetId: 'ast1', name: 'site.png', transform: { x: 0, y: 0, rotation: 3 }, mmPerPx: 12.5, naturalWidth: 1, naturalHeight: 1,
    crop: null, opacity: 0.7, visible: true, locked: true, calibration: null,
  });
  const asset: AssetRecord = { id: 'ast1', projectId: doc.id, name: 'site.png', mimeType: 'image/png', byteSize: PNG.length, width: 1, height: 1, blob: new Blob([PNG], { type: 'image/png' }), createdAt: new Date().toISOString() };
  return { doc, bed, asset };
}

describe('project persistence (IndexedDB)', () => {
  beforeEach(async () => {
    const db = openDatabase(`test-${Math.random()}`);
    setDb(db);
  });

  it('creates, lists, reloads, duplicates and deletes projects', async () => {
    const { doc, asset } = sampleProject();
    await storeImportedProject(doc, [asset]);
    const list = await listProjects();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: 'My Garden', objectCount: 2, plantingCount: 2 });

    const loaded = await loadProject(doc.id);
    expect(loaded?.ok).toBe(true);
    if (!loaded?.ok) return;
    expect(loaded.doc).toEqual(doc);

    const copy = await duplicateProject(loaded.doc, 'Copy of My Garden');
    expect(copy.id).not.toBe(doc.id);
    const copyAssets = await assetsForProject(copy.id);
    expect(copyAssets).toHaveLength(1);
    expect(copy.backgrounds[0].assetId).toBe(copyAssets[0].id);

    await deleteProject(doc.id);
    expect((await listProjects()).map((p) => p.id)).toEqual([copy.id]);
    expect(await assetsForProject(doc.id)).toHaveLength(0);
  });

  it('keeps saving after edits (simulated reload)', async () => {
    const { doc } = sampleProject();
    await saveProject(doc);
    const edited = { ...doc, meta: { ...doc.meta, name: 'Renamed' } };
    await saveProject(edited);
    // A new connection simulates a browser reload.
    const res = await loadProject(doc.id);
    expect(res?.ok && res.doc.meta.name).toBe('Renamed');
  });

  it('prunes automatic snapshots but keeps manual ones', async () => {
    const { doc } = sampleProject();
    await saveProject(doc);
    await createSnapshot(doc, 'Manual', false);
    for (let i = 0; i < MAX_AUTO_SNAPSHOTS + 5; i++) await createSnapshot(doc, `Auto ${i}`, true);
    const snaps = await listSnapshots(doc.id);
    expect(snaps.filter((s) => s.auto)).toHaveLength(MAX_AUTO_SNAPSHOTS);
    expect(snaps.filter((s) => !s.auto)).toHaveLength(1);
  });

  it('reports corrupted stored documents instead of crashing', async () => {
    const res = parseStoredDoc({ id: 'x', docVersion: 1, meta: { name: '' } });
    expect(res.ok).toBe(false);
    expect(parseStoredDoc(null).ok).toBe(false);
  });
});

describe('schema migration', () => {
  it('upgrades pre-versioned documents and rejects newer ones', () => {
    const { doc } = sampleProject();
    const { docVersion: _v, ...legacy } = doc;
    const res = parseStoredDoc(legacy);
    expect(res.ok && res.migratedFrom).toBe(0);
    expect(() => migrateRawDoc({ ...doc, docVersion: 99 })).toThrow(/newer version/);
  });
  it('runs custom migration chains in order', () => {
    const chain = { 0: (d: Record<string, unknown>) => ({ ...d, a: 1, docVersion: 1 }), 1: (d: Record<string, unknown>) => ({ ...d, b: (d.a as number) + 1, docVersion: 2 }) };
    const { doc } = migrateRawDoc({}, 2, chain);
    expect(doc).toMatchObject({ a: 1, b: 2, docVersion: 2 });
  });
  it('repairs dangling references', () => {
    const { doc, bed } = sampleProject();
    const broken = structuredClone(doc);
    broken.layers.find((l) => l.id === bed.layerId)!.objectIds = []; // object missing from its layer
    broken.objects[bed.id].groupId = 'nope';
    broken.plantings.ghost = { ...Object.values(doc.plantings)[0], id: 'ghost', objectId: 'deleted' };
    const res = parseStoredDoc(broken);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.doc.layers.some((l) => l.objectIds.includes(bed.id))).toBe(true);
    expect(res.doc.objects[bed.id].groupId).toBeNull();
    expect(res.doc.plantings.ghost).toBeUndefined();
  });
});

describe('project import/export', () => {
  it('round-trips a project package (.gtkproject) with images', async () => {
    const { doc, asset } = sampleProject();
    const blob = await buildProjectPackage(doc, [asset], lookup);
    const res = await importProjectFile(blob, known);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.warnings).toEqual([]);
    expect(res.doc.id).not.toBe(doc.id);
    expect(res.assets).toHaveLength(1);
    expect(res.assets[0].mimeType).toBe('image/png');
    expect(res.doc.backgrounds[0].assetId).toBe(res.assets[0].id);
    const { id: _a, backgrounds: _b, ...restA } = res.doc;
    const { id: _c, backgrounds: _d, ...restB } = doc;
    expect(restA).toEqual(restB);
  });

  it('round-trips a single JSON file with embedded images', async () => {
    const { doc, asset } = sampleProject();
    const blob = await buildProjectJson(doc, [asset], lookup, true);
    const text = await blob.text();
    const parsed = JSON.parse(text);
    expect(parsed.format).toBe('garden-toolkit-project');
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.objects[0].geometry).toBeDefined();
    expect(parsed.plants.length).toBe(2); // plant snapshots travel with the project
    const res = await importProjectFile(blob, known);
    expect(res.ok && res.assets.length).toBe(1);
  });

  it('embeds unknown plants so projects stay meaningful on other devices', async () => {
    const { doc, asset } = sampleProject();
    const blob = await buildProjectJson(doc, [asset], lookup, true);
    const res = await importProjectFile(blob, () => false);
    expect(res.ok && Object.keys(res.doc.embeddedPlants).sort()).toEqual(['daucus-carota-sativus', 'solanum-lycopersicum']);
  });

  it('rejects corrupted or hostile files gracefully', async () => {
    const cases: [Blob, RegExp][] = [
      [new Blob(['not json at all']), /not valid JSON/],
      [new Blob([JSON.stringify({ hello: 'world' })]), /not a Garden Toolkit project/],
      [new Blob([JSON.stringify({ format: 'garden-toolkit-project', schemaVersion: 7 })]), /newer/],
      [new Blob([JSON.stringify({ format: 'garden-toolkit-project', schemaVersion: 1, project: { name: 'x' } })]), /damaged/],
      [new Blob([zipSync({ 'other.txt': strToU8('hi') }) as BlobPart]), /project.json is missing/],
    ];
    for (const [blob, msg] of cases) {
      const res = await importProjectFile(blob, known);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toMatch(msg);
    }
  });

  it('refuses non-image assets such as SVG with scripts', async () => {
    const { doc, asset } = sampleProject();
    const blob = await buildProjectJson(doc, [asset], lookup, true);
    const json = JSON.parse(await blob.text());
    json.assets[0].data = btoa('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const res = await importProjectFile(new Blob([JSON.stringify(json)]), known);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.assets).toHaveLength(0);
    expect(res.doc.backgrounds).toHaveLength(0);
    expect(res.warnings.join(' ')).toMatch(/not a PNG, JPEG or WebP/);
  });

  it('ignores unexpected entries inside a package', async () => {
    const { doc, asset } = sampleProject();
    const pkg = await buildProjectPackage(doc, [asset], lookup);
    const { unzipSync } = await import('fflate');
    const files = unzipSync(new Uint8Array(await pkg.arrayBuffer()));
    files['../../evil.sh'] = strToU8('rm -rf /');
    files['assets/../../x.png'] = PNG;
    const res = await importProjectFile(new Blob([zipSync(files) as BlobPart]), known);
    expect(res.ok).toBe(true);
  });
});
