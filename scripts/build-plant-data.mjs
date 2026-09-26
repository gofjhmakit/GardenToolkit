#!/usr/bin/env node
/**
 * Builds public/data/plants/core.json from the authored seed modules in
 * data/plants/seed. Schema validation happens in the test suite
 * (src/plants/dataset.test.ts) using the same zod schema the app uses.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vegetables from '../data/plants/seed/vegetables.mjs';
import herbs from '../data/plants/seed/herbs.mjs';
import fruit from '../data/plants/seed/fruit.mjs';
import ornamentals from '../data/plants/seed/ornamentals.mjs';
import vegetables2 from '../data/plants/seed/vegetables2.mjs';
import herbs2 from '../data/plants/seed/herbs2.mjs';
import flowers2 from '../data/plants/seed/flowers2.mjs';
import perennials2 from '../data/plants/seed/perennials2.mjs';
import woody2 from '../data/plants/seed/woody2.mjs';
import greenmanure from '../data/plants/seed/greenmanure.mjs';
import { companions, rotation, sources } from '../data/plants/seed/relations.mjs';
import { HARDINESS } from '../data/plants/seed/hardiness.mjs';
import { FI_TEXTS } from '../data/plants/seed/fi-texts.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const plants = [...vegetables, ...vegetables2, ...herbs, ...herbs2, ...fruit, ...woody2, ...ornamentals, ...flowers2, ...perennials2, ...greenmanure];

const ids = new Set();
for (const p of plants) {
  if (ids.has(p.id)) throw new Error(`Duplicate plant id: ${p.id}`);
  ids.add(p.id);
}
for (const [id, [fiMax, usdaMin, usdaMax]] of Object.entries(HARDINESS)) {
  const p = plants.find((x) => x.id === id);
  if (!p) throw new Error(`Hardiness entry for unknown plant ${id}`);
  p.growing.finnishZones ??= { min: 1, max: fiMax };
  p.growing.usdaZones ??= { min: usdaMin, max: usdaMax };
}
for (const c of companions) {
  for (const end of [c.a, c.b]) {
    if (!end.includes(':') && !ids.has(end)) throw new Error(`Companion relation references unknown plant ${end}`);
  }
}

// Fill in Finnish for every localised text ({ en, fi? }) that does not set it inline.
const untranslated = new Set();
function localise(v) {
  if (Array.isArray(v)) v.forEach(localise);
  else if (v && typeof v === 'object') {
    if (typeof v.en === 'string' && v.fi === undefined) {
      if (FI_TEXTS[v.en]) v.fi = FI_TEXTS[v.en];
      else untranslated.add(v.en);
    }
    Object.values(v).forEach(localise);
  }
}
localise(plants);
localise(companions);
localise(rotation);
if (untranslated.size) console.warn(`No Finnish text for ${untranslated.size} strings (add them to fi-texts.mjs):\n  ${[...untranslated].join('\n  ')}`);

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
// Keep the previous "generated" date when nothing else changed, so rebuilding
// does not leave the committed file modified.
if (existsSync(out)) {
  try {
    const prev = JSON.parse(readFileSync(out, 'utf8'));
    const same = JSON.stringify({ ...prev, dataset: { ...prev.dataset, generated: dataset.dataset.generated } }) === JSON.stringify(dataset);
    if (same) dataset.dataset.generated = prev.dataset.generated;
  } catch {
    // Unreadable previous file: just overwrite it.
  }
}
writeFileSync(out, JSON.stringify(dataset));
console.log(`Wrote ${plants.length} plants, ${companions.length} companion relations to ${out}`);
