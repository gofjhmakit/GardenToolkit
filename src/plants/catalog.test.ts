import { describe, expect, it } from 'vitest';
import { PlantCatalog } from './catalog';
import { loadCoreCatalog } from '../test/fixtures';
import { plantDisplayName, allCommonNames, localizedText } from './names';
import { EMPTY_FILTER, isFilterActive, matchesFilter } from './filter';
import { anchorsFor } from '../engine/plantSeasons';
import { defaultLocation } from '../domain/projectFactory';

const core = loadCoreCatalog();

describe('plant catalog', () => {
  it('lets user plants override and be removed; index is rebuilt', () => {
    const c = new PlantCatalog();
    c.addDataset(JSON.parse(JSON.stringify({ format: 'garden-toolkit-plants', schemaVersion: 1, dataset: { id: 'd', title: 'D', version: '1', license: 'CC0' }, plants: [core.get('allium-cepa')] })));
    expect(c.searchIds('onion')).toEqual(['allium-cepa']);
    const mine = { ...core.get('allium-cepa')!, id: 'user-1', dataset: 'user', names: { scientific: 'Allium cepa', common: { en: ['Grandma onion'] }, synonyms: [] } };
    c.addUserPlants([mine, { bad: true }]);
    expect(c.datasets.find((d) => d.id === 'user')).toMatchObject({ plantCount: 1, rejected: 1 });
    expect(c.searchIds('grandma')).toEqual(['user-1']);
    c.removePlant('user-1');
    expect(c.searchIds('grandma')).toEqual([]);
    c.upsertUserPlant(mine);
    expect(c.get('user-1')).toBeDefined();
  });
  it('later datasets override rotation rules per group', () => {
    const c = new PlantCatalog();
    const base = { format: 'garden-toolkit-plants', schemaVersion: 1, dataset: { id: 'a', title: 'A', version: '1', license: 'x' }, plants: [] };
    c.addDataset({ ...base, rotation: [{ group: 'legumes', label: { en: 'L' }, minYearsBetween: { min: 1, max: 1 }, reason: { en: 'r' }, confidence: 'low' }] });
    c.addDataset({ ...base, rotation: [{ group: 'legumes', label: { en: 'L2' }, minYearsBetween: { min: 3, max: 4 }, reason: { en: 'r' }, confidence: 'low' }] });
    expect(c.rotationRules).toHaveLength(1);
    expect(c.rotationRules[0].label.en).toBe('L2');
  });
  it('falls back to OR search and handles empty queries', () => {
    expect(core.searchIds('')).toEqual([]);
    expect(core.searchIds('carrot zzzzqqq').length).toBeGreaterThan(0);
  });
  it('names fall back sensibly', () => {
    const p = core.get('daucus-carota-sativus')!;
    expect(plantDisplayName(p, 'fi')).toBe('Porkkana');
    expect(plantDisplayName(p, 'sv')).toBe('Carrot');
    expect(plantDisplayName({ ...p, names: { ...p.names, common: {} } })).toBe('Daucus carota subsp. sativus');
    expect(allCommonNames(p)).toContain('Porkkana');
    expect(localizedText({ fi: 'hei' }, 'en')).toBe('hei');
    expect(localizedText(null)).toBeNull();
  });
  it('filters by favourites, edibility, lifecycle, water and spacing data', () => {
    const a = anchorsFor(defaultLocation(), 2026);
    const carrot = core.get('daucus-carota-sativus')!;
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(matchesFilter(carrot, { ...EMPTY_FILTER, favouritesOnly: true }, new Set(), a)).toBe(false);
    expect(matchesFilter(carrot, { ...EMPTY_FILTER, favouritesOnly: true }, new Set([carrot.id]), a)).toBe(true);
    expect(matchesFilter(carrot, { ...EMPTY_FILTER, edible: false }, new Set(), a)).toBe(false);
    expect(matchesFilter(carrot, { ...EMPTY_FILTER, lifecycle: 'perennial' }, new Set(), a)).toBe(false);
    expect(matchesFilter(carrot, { ...EMPTY_FILTER, water: 'medium', withSpacing: true, sowMonth: 5 }, new Set(), a)).toBe(true);
    expect(matchesFilter(core.get('tulipa')!, { ...EMPTY_FILTER, harvestMonth: 7 }, new Set(), a)).toBe(false);
  });
});
