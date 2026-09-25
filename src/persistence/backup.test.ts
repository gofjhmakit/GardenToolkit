// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { createProject, makeObject } from '../domain/projectFactory';
import { addObjects, assignPlant } from '../editor/commands';
import { loadCoreCatalog } from '../test/fixtures';
import type { AssetRecord } from './db';
import { BACKUP_FORMAT, buildBackupArchive, buildProjectJson, buildProjectPackage, importAnyFile, LIMITS } from './projectPackage';

const catalog = loadCoreCatalog();
const lookup = (id: string) => catalog.get(id);
const known = (id: string) => catalog.plants.has(id);
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));

function project(name: string, withImage = false) {
  const doc = createProject(name);
  const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 2000, height: 1000 });
  addObjects(doc, [bed]);
  assignPlant(doc, [bed.id], 'allium-cepa');
  const assets: AssetRecord[] = [];
  if (withImage) {
    doc.backgrounds.push({ id: 'bg', assetId: `ast-${name}`, name: 'plan.png', transform: { x: 0, y: 0, rotation: 0 }, mmPerPx: 10, naturalWidth: 1, naturalHeight: 1, crop: null, opacity: 1, visible: true, locked: true, calibration: null });
    assets.push({ id: `ast-${name}`, projectId: doc.id, name: 'plan.png', mimeType: 'image/png', byteSize: PNG.length, width: 1, height: 1, blob: new Blob([PNG], { type: 'image/png' }), createdAt: '2026-01-01' });
  }
  return { doc, assets };
}

describe('multi-project backups', () => {
  it('bundles several projects (with images) and imports them all back', async () => {
    const a = project('Front garden', true);
    const b = project('Allotment');
    const c = project('Allotment'); // same name must not collide
    const blob = await buildBackupArchive([a, b, c], lookup, new Date('2026-09-25T00:00:00Z'));
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const manifest = JSON.parse(new TextDecoder().decode(files['backup.json']));
    expect(manifest).toMatchObject({ format: BACKUP_FORMAT, schemaVersion: 1, exportedAt: '2026-09-25T00:00:00.000Z' });
    expect(manifest.projects.map((p: { file: string }) => p.file)).toEqual(['projects/Front-garden.gtkproject', 'projects/Allotment.gtkproject', 'projects/Allotment-2.gtkproject']);

    const results = await importAnyFile(blob, 'backup.gtkbackup', known);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.result.ok)).toBe(true);
    const names = results.map((r) => (r.result.ok ? r.result.doc.meta.name : '')).sort();
    expect(names).toEqual(['Allotment', 'Allotment', 'Front garden']);
    const front = results.find((r) => r.result.ok && r.result.doc.meta.name === 'Front garden')!.result;
    expect(front.ok && front.assets).toHaveLength(1);
    // Every import gets a fresh id.
    const ids = results.map((r) => (r.result.ok ? r.result.doc.id : ''));
    expect(new Set([...ids, a.doc.id, b.doc.id, c.doc.id]).size).toBe(6);
  });

  it('routes single project packages and JSON files through the same entry point', async () => {
    const p = project('Solo', true);
    const pkg = await importAnyFile(await buildProjectPackage(p.doc, p.assets, lookup), 'solo.gtkproject', known);
    expect(pkg).toHaveLength(1);
    expect(pkg[0].result.ok).toBe(true);
    const json = await importAnyFile(await buildProjectJson(p.doc, p.assets, lookup), 'solo.json', known);
    expect(json).toHaveLength(1);
    expect(json[0].result.ok && json[0].result.assets).toHaveLength(1);
  });

  it('reports each broken project in a backup separately and keeps the good ones', async () => {
    const good = await buildProjectPackage(project('Good').doc, [], lookup);
    const zip = zipSync({
      'backup.json': strToU8('{}'),
      'projects/Good.gtkproject': new Uint8Array(await good.arrayBuffer()),
      'projects/Broken.gtkproject': strToU8('not a zip'),
      'projects/../../escape.gtkproject': strToU8('x'),
      'other/ignored.txt': strToU8('x'),
    });
    const results = await importAnyFile(new Blob([zip as BlobPart]), 'mixed.gtkbackup', known);
    expect(results.map((r) => [r.source, r.result.ok])).toEqual([
      ['Broken.gtkproject', false],
      ['Good.gtkproject', true],
    ]);
  });

  it('rejects unrelated ZIPs and oversized archives, never throws', async () => {
    const other = zipSync({ 'readme.txt': strToU8('hi') });
    const r1 = await importAnyFile(new Blob([other as BlobPart]), 'x.zip', known);
    expect(r1[0].result.ok).toBe(false);
    if (!r1[0].result.ok) expect(r1[0].result.error).toMatch(/not a Garden Toolkit project or backup/);
    const orig = LIMITS.maxFileBytes;
    LIMITS.maxFileBytes = 10;
    try {
      const r2 = await importAnyFile(new Blob([new Uint8Array(100)]), 'big', known);
      expect(r2[0].result.ok).toBe(false);
    } finally {
      LIMITS.maxFileBytes = orig;
    }
    const r3 = await importAnyFile(new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3])]), 'bad.zip', known);
    expect(r3[0].result.ok).toBe(false);
  });
});

describe('total extraction limit', () => {
  it('rejects packages and backups whose contents add up to more than the limit', async () => {
    const { doc, assets } = project('Big', true);
    const pkg = await buildProjectPackage(doc, assets, lookup);
    const backup = await buildBackupArchive([{ doc, assets }, project('Second', true)], lookup);
    const orig = LIMITS.maxExtractedBytes;
    try {
      // Each entry is below its own limit; only the total exceeds the cap.
      LIMITS.maxExtractedBytes = 200;
      const r1 = await importAnyFile(pkg, 'big.gtkproject', known);
      expect(r1[0].result.ok).toBe(false);
      if (!r1[0].result.ok) expect(r1[0].result.error).toMatch(/too large/);
      const r2 = await importAnyFile(backup, 'all.gtkbackup', known);
      expect(r2).toHaveLength(1);
      expect(r2[0].result.ok).toBe(false);
      if (!r2[0].result.ok) expect(r2[0].result.error).toMatch(/too large/);
    } finally {
      LIMITS.maxExtractedBytes = orig;
    }
    // Normal-sized files are unaffected.
    expect((await importAnyFile(backup, 'all.gtkbackup', known)).every((r) => r.result.ok)).toBe(true);
  });
});
