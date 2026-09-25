/**
 * Plant filtering for the plant browser. Pure and index-backed: text search
 * uses the MiniSearch index; attribute filters are simple predicates. The
 * browser renders results through a virtualised list, so returning thousands
 * of ids is fine.
 */
import type { PlantCatalog } from './catalog';
import type { Plant, PlantCategory, SunLevel } from './schema';
import { plantDisplayName } from './names';
import { plantSeasons, spanIncludesMonth, type SeasonAnchors } from '../engine/plantSeasons';

export interface PlantFilter {
  query: string;
  categories: PlantCategory[];
  lifecycle: 'annual' | 'biennial' | 'perennial' | null;
  edible: boolean | null;
  sun: SunLevel | null;
  water: 'low' | 'medium' | 'high' | null;
  sowMonth: number | null;
  harvestMonth: number | null;
  favouritesOnly: boolean;
  /** Only plants with spacing data (i.e. quantity can be calculated). */
  withSpacing: boolean;
}

export const EMPTY_FILTER: PlantFilter = {
  query: '',
  categories: [],
  lifecycle: null,
  edible: null,
  sun: null,
  water: null,
  sowMonth: null,
  harvestMonth: null,
  favouritesOnly: false,
  withSpacing: false,
};

export function isFilterActive(f: PlantFilter): boolean {
  return (
    f.categories.length > 0 ||
    f.lifecycle != null ||
    f.edible != null ||
    f.sun != null ||
    f.water != null ||
    f.sowMonth != null ||
    f.harvestMonth != null ||
    f.favouritesOnly ||
    f.withSpacing
  );
}

export function matchesFilter(p: Plant, f: PlantFilter, favourites: ReadonlySet<string>, anchors: SeasonAnchors): boolean {
  if (f.categories.length && !f.categories.includes(p.category)) return false;
  if (f.lifecycle && p.lifecycle !== f.lifecycle) return false;
  if (f.edible != null && p.edible !== f.edible) return false;
  if (f.sun && !(p.growing.sun ?? []).includes(f.sun)) return false;
  if (f.water && p.growing.water !== f.water) return false;
  if (f.favouritesOnly && !favourites.has(p.id)) return false;
  if (f.withSpacing && !(p.planting.inRowSpacingCm || p.planting.gridSpacingCm || p.planting.matureWidthCm)) return false;
  if (f.sowMonth != null || f.harvestMonth != null) {
    const s = plantSeasons(p, anchors);
    if (f.sowMonth != null && !spanIncludesMonth(s.sow ?? s.plant, f.sowMonth)) return false;
    if (f.harvestMonth != null && !spanIncludesMonth(s.harvest, f.harvestMonth)) return false;
  }
  return true;
}

export function filterPlants(
  catalog: PlantCatalog,
  f: PlantFilter,
  favourites: ReadonlySet<string>,
  anchors: SeasonAnchors,
  language = 'en',
): Plant[] {
  let candidates: Plant[];
  if (f.query.trim()) {
    candidates = catalog
      .searchIds(f.query)
      .map((id) => catalog.get(id))
      .filter((p): p is Plant => !!p);
  } else {
    candidates = catalog.all().sort((a, b) => plantDisplayName(a, language).localeCompare(plantDisplayName(b, language)));
  }
  if (!isFilterActive(f)) return candidates;
  return candidates.filter((p) => matchesFilter(p, f, favourites, anchors));
}
