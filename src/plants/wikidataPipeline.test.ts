// @vitest-environment node
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script without type declarations
import { buildQuery, genusCategoryMap, slug, transform } from '../../scripts/import-wikidata.mjs';
import { PlantCatalog } from './catalog';

const b = (qid: string, name: string, genus: string, label?: string, lang?: string, family = 'Rosaceae', sitelinks = '10') => ({
  item: { value: `http://www.wikidata.org/entity/${qid}` },
  name: { value: name },
  genusName: { value: genus },
  familyName: { value: family },
  sitelinks: { value: sitelinks },
  ...(label ? { label: { value: label }, labelLang: { value: lang } } : {}),
});

describe('Wikidata import pipeline', () => {
  const cats = { Malus: 'fruit-tree', Rosa: 'shrub' };
  it('merges labels per item, skips scientific-name labels and existing curated species', () => {
    const json = {
      results: {
        bindings: [
          b('Q1', 'Malus sylvestris', 'Malus', 'crab apple', 'en'),
          b('Q1', 'Malus sylvestris', 'Malus', 'metsäomenapuu', 'fi'),
          b('Q1', 'Malus sylvestris', 'Malus', 'Malus sylvestris', 'de'),
          b('Q2', 'Malus domestica', 'Malus', 'apple', 'en'),
          b('Q3', 'Rosa glauca', 'Rosa', 'redleaf rose', 'en'),
          b('Q4', 'Unknownia x', 'Unknownia', 'nope', 'en'),
          b('Q5', 'Malus', 'Malus'),
        ],
      },
    };
    const ds = transform(json, cats, new Set(['malus domestica']), '2026-01-01');
    expect(ds.plants.map((p: { id: string }) => p.id)).toEqual(['wd-malus-sylvestris', 'wd-rosa-glauca']);
    const crab = ds.plants[0];
    expect(crab.names.common).toEqual({ en: ['Crab apple'], fi: ['Metsäomenapuu'] });
    expect(crab.category).toBe('fruit-tree');
    expect(crab.provenance.confidence).toBe('unknown');
    expect(crab.planting.inRowSpacingCm).toBeUndefined();
    // The generated dataset is valid for the app.
    const c = new PlantCatalog();
    expect(c.addDataset(ds)).toBe(true);
    expect(c.issues).toEqual([]);
    expect(c.plants.size).toBe(2);
  });
  it('builds a bounded SPARQL query and genus map', () => {
    const q = buildQuery(['Malus', 'Ro"sa'], 5);
    expect(q).toContain('"Malus"');
    expect(q).toContain('"Rosa"');
    expect(q).toContain('>= 5');
    expect(genusCategoryMap({ _comment: 'x', a: ['G1', 'G2'], b: ['G2'] })).toEqual({ G1: 'a', G2: 'a' });
    expect(slug('Malus × domestica')).toBe('malus-domestica');
  });
});
