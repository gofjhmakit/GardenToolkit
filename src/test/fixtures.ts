import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PlantCatalog } from '../plants/catalog';

let cached: PlantCatalog | null = null;

/** Loads the real bundled dataset from public/data (built by scripts/build-plant-data.mjs). */
export function loadCoreCatalog(): PlantCatalog {
  if (cached) return cached;
  const json = JSON.parse(readFileSync(resolve(__dirname, '../../public/data/plants/core.json'), 'utf8'));
  const c = new PlantCatalog();
  c.addDataset(json);
  cached = c;
  return c;
}
