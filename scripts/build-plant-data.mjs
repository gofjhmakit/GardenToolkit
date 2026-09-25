#!/usr/bin/env node
/**
 * Builds public/data/plants/core.json from the authored seed modules in
 * data/plants/seed. Schema validation happens in the test suite
 * (src/plants/dataset.test.ts) using the same zod schema the app uses.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vegetables from '../data/plants/seed/vegetables.mjs';
import herbs from '../data/plants/seed/herbs.mjs';
import fruit from '../data/plants/seed/fruit.mjs';
import ornamentals from '../data/plants/seed/ornamentals.mjs';
import { companions, rotation, sources } from '../data/plants/seed/relations.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const plants = [...vegetables, ...herbs, ...fruit, ...ornamentals];

const ids = new Set();
for (const p of plants) {
  if (ids.has(p.id)) throw new Error(`Duplicate plant id: ${p.id}`);
  ids.add(p.id);
}
for (const c of companions) {
  for (const end of [c.a, c.b]) {
    if (!end.includes(':') && !ids.has(end)) throw new Error(`Companion relation references unknown plant ${end}`);
  }
}

const dataset = {
  format: 'garden-toolkit-plants',
  schemaVersion: 1,
  dataset: {
    id: 'gtk-core',
    title: 'Garden Toolkit core plants',
    version: '2026.09.1',
    license: 'CC0-1.0',
    description: 'Curated starter dataset of common temperate garden plants with planting, timing, care and yield ranges.',
    generated: new Date().toISOString().slice(0, 10),
  },
  sources,
  plants,
  companions,
  rotation,
};

const out = resolve(root, 'public/data/plants/core.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(dataset));
console.log(`Wrote ${plants.length} plants, ${companions.length} companion relations to ${out}`);
