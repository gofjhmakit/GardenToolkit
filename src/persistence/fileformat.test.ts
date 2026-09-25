// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { createProject, makeObject } from '../domain/projectFactory';
import { addObjects, assignPlant } from '../editor/commands';
import { loadCoreCatalog } from '../test/fixtures';
import { fromProjectFile, migrateProjectFile, ProjectFileSchema, toProjectFile } from './projectFile';
import { base64ToBytes, bytesToBase64, detectImageMime, importProjectFile, LIMITS } from './projectPackage';

const catalog = loadCoreCatalog();

describe('public file format mapping', () => {
  it('maps internal → public → internal without loss', () => {
    const doc = createProject('Map', { now: new Date('2026-01-01') });
    const bed = makeObject(doc, 'bed', { x: 1, y: 2, rotation: 3 }, { type: 'polygon', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }] });
    addObjects(doc, [bed]);
    assignPlant(doc, [bed.id], 'allium-cepa');
    doc.calendarOverrides.x = { done: true };
    doc.notes.push({ id: 'n', title: 't', body: 'b', createdAt: 'c', updatedAt: 'u' });
    const file = toProjectFile(doc, [], (id) => catalog.get(id), { now: new Date('2026-01-02') });
    expect(ProjectFileSchema.safeParse(JSON.parse(JSON.stringify(file))).success).toBe(true);
    expect(file.objects[0].geometry.type).toBe('polygon');
    expect(file.plants).toHaveLength(1);
    const back = fromProjectFile(file, { newProjectId: doc.id, assetIdMap: new Map(), knownPlant: () => true });
    expect(back.warnings).toEqual([]);
    expect(back.doc).toEqual(doc);
  });
  it('warns about duplicate ids, missing images and unknown plants', () => {
    const doc = createProject('W');
    const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 1, height: 1 });
    addObjects(doc, [bed]);
    assignPlant(doc, [bed.id], 'no-such-plant');
    doc.backgrounds.push({ id: 'b', assetId: 'gone', name: 'img', transform: { x: 0, y: 0, rotation: 0 }, mmPerPx: 1, naturalWidth: 1, naturalHeight: 1, crop: null, opacity: 1, visible: true, locked: true, calibration: null });
    const file = toProjectFile(doc, [], () => undefined);
    file.objects.push({ ...file.objects[0] });
    file.plants.push({ broken: true });
    const res = fromProjectFile(file, { newProjectId: 'p', assetIdMap: new Map(), knownPlant: () => false });
    const w = res.warnings.join(' | ');
    expect(w).toMatch(/Duplicate object id/);
    expect(w).toMatch(/missing its image/);
    expect(w).toMatch(/not in your plant database/);
    expect(w).toMatch(/invalid and ignored/);
  });
  it('rejects files without a version or from the future', () => {
    expect(() => migrateProjectFile({ format: 'garden-toolkit-project' })).toThrow(/schemaVersion/);
    expect(() => migrateProjectFile({ schemaVersion: 2 })).toThrow(/newer/);
    expect(migrateProjectFile({ schemaVersion: 1, a: 1 })).toEqual({ schemaVersion: 1, a: 1 });
  });
});

describe('binary helpers & limits', () => {
  it('detects image types by magic bytes', () => {
    expect(detectImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe('image/png');
    expect(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectImageMime(strToU8('RIFF1234WEBPVP8 '))).toBe('image/webp');
    expect(detectImageMime(strToU8('<svg'))).toBeNull();
    expect(detectImageMime(new Uint8Array([]))).toBeNull();
  });
  it('base64 round trip for large buffers', () => {
    const big = new Uint8Array(200_000).map((_, i) => (i * 31) & 255);
    expect(base64ToBytes(bytesToBase64(big))).toEqual(big);
  });
  it('refuses oversized project.json declared inside a ZIP', async () => {
    const orig = LIMITS.maxJsonBytes;
    LIMITS.maxJsonBytes = 10;
    try {
      const zip = zipSync({ 'project.json': strToU8(JSON.stringify({ format: 'garden-toolkit-project', schemaVersion: 1 })) });
      const res = await importProjectFile(new Blob([zip as BlobPart]), () => true);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toMatch(/too large/);
    } finally {
      LIMITS.maxJsonBytes = orig;
    }
  });
  it('refuses too many entries (zip bomb style)', async () => {
    const files: Record<string, Uint8Array> = {};
    for (let i = 0; i < LIMITS.maxEntries + 5; i++) files[`junk/${i}.txt`] = strToU8('x');
    const res = await importProjectFile(new Blob([zipSync(files) as BlobPart]), () => true);
    expect(res.ok).toBe(false);
  });
  it('handles an empty file', async () => {
    const res = await importProjectFile(new Blob([]), () => true);
    expect(res.ok).toBe(false);
  });
});
