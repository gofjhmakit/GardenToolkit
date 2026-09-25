import { describe, expect, it } from 'vitest';
import { loadCoreCatalog } from '../test/fixtures';
import { PlantCatalog } from './catalog';
import { EMPTY_FILTER, filterPlants } from './filter';
import { anchorsFor } from '../engine/plantSeasons';
import { createProject } from '../domain/projectFactory';
import type { Plant } from './schema';

describe('bundled plant dataset', () => {
  const catalog = loadCoreCatalog();
  it('validates every record against the schema', () => {
    expect(catalog.issues).toEqual([]);
    expect(catalog.datasets[0].rejected).toBe(0);
    expect(catalog.plants.size).toBeGreaterThanOrEqual(100);
  });
  it('gives every record a known source and a confidence level', () => {
    for (const p of catalog.all()) {
      expect(p.provenance.sources.length, p.id).toBeGreaterThan(0);
      for (const s of p.provenance.sources) expect(catalog.sources.has(s.id), `${p.id} → ${s.id}`).toBe(true);
      expect(['high', 'medium', 'low', 'unknown']).toContain(p.provenance.confidence);
    }
  });
  it('does not present yield estimates without a confidence level', () => {
    for (const p of catalog.all()) {
      if (p.yield?.perPlantKg || p.yield?.perM2Kg) expect(p.yield.confidence, p.id).not.toBe('unknown');
    }
  });
  it('keeps spacing ranges sane (cm)', () => {
    for (const p of catalog.all()) {
      const s = p.planting.inRowSpacingCm;
      if (s) {
        expect(s.min, p.id).toBeGreaterThan(0);
        expect(s.max, p.id).toBeLessThan(2000);
      }
    }
  });
  it('rejects individual malformed records without dropping the dataset', () => {
    const c = new PlantCatalog();
    const ok = c.addDataset({
      format: 'garden-toolkit-plants',
      schemaVersion: 1,
      dataset: { id: 't', title: 'T', version: '1', license: 'CC0' },
      plants: [catalog.get('allium-cepa'), { id: 'broken', names: 'nope' }],
    });
    expect(ok).toBe(true);
    expect(c.plants.size).toBe(1);
    expect(c.issues[0].plantId).toBe('broken');
    expect(c.addDataset({ format: 'something-else' })).toBe(false);
  });
});

describe('plant search', () => {
  const catalog = loadCoreCatalog();
  const anchors = anchorsFor(createProject('x', { location: { lastFrost: '05-20', firstFrost: '09-25' } }).location, 2026);
  const search = (q: string, extra = {}) => filterPlants(catalog, { ...EMPTY_FILTER, query: q, ...extra }, new Set(), anchors);
  it('finds by common, scientific and Finnish names, prefix and fuzzy', () => {
    expect(search('carrot')[0].id).toBe('daucus-carota-sativus');
    expect(search('Daucus')[0].id).toBe('daucus-carota-sativus');
    expect(search('porkkana')[0].id).toBe('daucus-carota-sativus');
    expect(search('tomat')[0].id).toBe('solanum-lycopersicum');
    expect(search('tomatoe').map((p) => p.id)).toContain('solanum-lycopersicum');
    expect(search('paarynapuu')[0].id).toBe('pyrus-communis');
  });
  it('filters by category, sun and harvest month', () => {
    const herbs = search('', { categories: ['herb'] });
    expect(herbs.every((p) => p.category === 'herb')).toBe(true);
    const shade = search('', { sun: 'shade' });
    expect(shade.map((p) => p.id)).toContain('hosta');
    const julyHarvest = search('', { harvestMonth: 7 });
    expect(julyHarvest.map((p) => p.id)).toContain('ribes-nigrum');
  });
  it('stays fast with a large (10 000 record) dataset', () => {
    const base = catalog.get('lactuca-sativa')!;
    const plants: Plant[] = Array.from({ length: 10000 }, (_, i) => ({
      ...base,
      id: `synthetic-${i}`,
      names: { ...base.names, scientific: `Genus${i % 500} species${i}`, common: { en: [`Synthetic plant ${i}`] } },
    }));
    const c = new PlantCatalog();
    c.addDataset({ format: 'garden-toolkit-plants', schemaVersion: 1, dataset: { id: 'big', title: 'Big', version: '1', license: 'CC0' }, plants });
    const t0 = performance.now();
    c.warmIndex();
    const t1 = performance.now();
    const hits = c.searchIds('synthetic 4242');
    const t2 = performance.now();
    expect(hits[0]).toBe('synthetic-4242');
    expect(t1 - t0).toBeLessThan(5000);
    expect(t2 - t1).toBeLessThan(200);
  });
});
