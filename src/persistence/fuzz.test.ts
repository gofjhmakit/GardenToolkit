// @vitest-environment node
/** Fuzzing: corrupted stored documents and hostile import files must never throw. */
import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { createProject, makeObject } from '../domain/projectFactory';
import { addObjects, assignPlant } from '../editor/commands';
import { parseStoredDoc } from './migrations';
import { importProjectFile } from './projectPackage';
import { toProjectFile } from './projectFile';
import { prng } from '../test/prng';

function sampleDoc() {
  const doc = createProject('Fuzz');
  const bed = makeObject(doc, 'bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 1000, height: 1000 });
  const poly = makeObject(doc, 'lawn', { x: 0, y: 0, rotation: 0 }, { type: 'polygon', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }] });
  addObjects(doc, [bed, poly]);
  assignPlant(doc, [bed.id], 'daucus-carota-sativus');
  return doc;
}

const JUNK: unknown[] = [null, undefined, 0, -1, 1e308, NaN, '', 'x', true, [], {}, [1, 2], { a: 1 }, '<script>alert(1)</script>', '__proto__'];

/** Randomly mutates a JSON-compatible value in place (a few spots). */
function mutate(value: unknown, r: ReturnType<typeof prng>, depth = 0): unknown {
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (!keys.length) return value;
    for (let n = 0; n < r.int(1, 3); n++) {
      const k = r.pick(keys);
      const roll = r.next();
      if (roll < 0.3 || depth > 6) obj[k] = r.pick(JUNK);
      else if (roll < 0.4) delete obj[k];
      else obj[k] = mutate(obj[k], r, depth + 1);
    }
  }
  return value;
}

describe('fuzzing', () => {
  it('parseStoredDoc never throws on mutated documents', () => {
    const r = prng(42);
    let okCount = 0;
    for (let i = 0; i < 500; i++) {
      const doc = JSON.parse(JSON.stringify(sampleDoc()));
      const res = parseStoredDoc(mutate(doc, r));
      if (res.ok) okCount++;
      else expect(typeof res.error).toBe('string');
    }
    expect(okCount).toBeGreaterThan(0);
  });
  it('parseStoredDoc never throws on junk', () => {
    for (const j of JUNK) expect(() => parseStoredDoc(j)).not.toThrow();
  });
  it('importProjectFile never throws on mutated project files', async () => {
    const r = prng(7);
    const base = toProjectFile(sampleDoc(), [], () => undefined);
    for (let i = 0; i < 200; i++) {
      const file = mutate(JSON.parse(JSON.stringify(base)), r);
      const res = await importProjectFile(new Blob([JSON.stringify(file)]), () => true);
      expect(typeof res.ok).toBe('boolean');
      if (res.ok) expect(res.doc.meta.name.length).toBeGreaterThan(0);
    }
  });
  it('importProjectFile never throws on random bytes or broken zips', async () => {
    const r = prng(99);
    for (let i = 0; i < 100; i++) {
      const bytes = new Uint8Array(r.int(0, 4000)).map(() => r.int(0, 255));
      if (r.next() < 0.3) bytes.set([0x50, 0x4b, 0x03, 0x04]);
      const res = await importProjectFile(new Blob([bytes]), () => true);
      expect(res.ok).toBe(false);
    }
    const truncated = zipSync({ 'project.json': strToU8(JSON.stringify(toProjectFile(sampleDoc(), [], () => undefined))) }).slice(0, 60);
    expect((await importProjectFile(new Blob([truncated as BlobPart]), () => true)).ok).toBe(false);
  });
  it('rejects prototype-pollution attempts harmlessly', async () => {
    const file = JSON.parse(JSON.stringify(toProjectFile(sampleDoc(), [], () => undefined)));
    const text = JSON.stringify(file).replace('"settings":{', '"settings":{"__proto__":{"polluted":true},');
    await importProjectFile(new Blob([text]), () => true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
