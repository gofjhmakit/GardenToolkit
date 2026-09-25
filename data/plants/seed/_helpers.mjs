/**
 * Authoring helpers for the Garden Toolkit core seed dataset.
 * Units: centimetres, days, weeks, kilograms. See docs/PLANT_DATA.md.
 */
export const R = (min, max = min) => ({ min, max });
/** Window relative to the average last spring frost, in weeks. */
export const LF = (startWeeks, endWeeks = startWeeks) => ({ relativeTo: 'lastFrost', startWeeks, endWeeks });
/** Window relative to the average first autumn frost, in weeks. */
export const FF = (startWeeks, endWeeks = startWeeks) => ({ relativeTo: 'firstFrost', startWeeks, endWeeks });
/** Fixed northern-hemisphere window, MM-DD. */
export const FIX = (start, end) => ({ relativeTo: 'fixed', start, end });
export const t = (en, fi) => (fi ? { en, fi } : { en });

export const UPDATED = '2026-09-25';

/**
 * Builds a plant record with the dataset defaults.
 * `conf` = overall record confidence; `yieldConf` = yield confidence.
 */
export function plant(id, scientific, common, spec) {
  const {
    family = null,
    genus = scientific.split(' ')[0],
    species = scientific.split(' ')[1] ?? null,
    infraspecific = null,
    category,
    tags = [],
    lifecycle = null,
    edible = null,
    synonyms = [],
    growing = {},
    planting = {},
    timing = {},
    care = {},
    yield: y = null,
    rotation = null,
    conf = 'medium',
    sourceNote,
  } = spec;
  return {
    id,
    dataset: 'gtk-core',
    names: { scientific, common, synonyms },
    taxonomy: { family, genus, species, infraspecific, cultivar: null },
    category,
    tags,
    lifecycle,
    edible,
    growing,
    planting: { methods: [], ...planting },
    timing,
    care,
    yield: y,
    rotation,
    provenance: {
      sources: [{ id: 'gtk-editorial', ...(sourceNote ? { note: sourceNote } : {}) }],
      confidence: conf,
      updated: UPDATED,
    },
  };
}
