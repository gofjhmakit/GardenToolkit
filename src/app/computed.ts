/**
 * Memoised access to calculation-engine results for the UI. The engine is
 * pure; here we cache results per object keyed by the (immutable) inputs so
 * that editing one bed does not recompute every other bed.
 */
import { useMemo } from 'react';
import type { GardenObject, Planting, ProjectDoc } from '../domain/project';
import { kindInfo } from '../domain/objectKinds';
import { computeObjectPlantings, type PlantingComputation, type PlantLookup } from '../engine/plantings';
import { calculateExpectedHarvest, type HarvestEstimate } from '../engine/harvest';
import { useEditor } from '../editor/store';
import { usePlantLookup } from './lookup';

interface CacheEntry {
  obj: GardenObject;
  plantings: Planting[];
  lookup: PlantLookup;
  season: number;
  result: PlantingComputation[];
}

const cache = new Map<string, CacheEntry>();

function sameList(a: Planting[], b: Planting[]): boolean {
  return a.length === b.length && a.every((p, i) => p === b[i]);
}

export function plantingsIndex(doc: ProjectDoc): Map<string, Planting[]> {
  const m = new Map<string, Planting[]>();
  for (const p of Object.values(doc.plantings)) {
    const list = m.get(p.objectId);
    if (list) list.push(p);
    else m.set(p.objectId, [p]);
  }
  return m;
}

const indexCache = new WeakMap<ProjectDoc['plantings'], Map<string, Planting[]>>();

export function getPlantingsIndex(doc: ProjectDoc): Map<string, Planting[]> {
  let idx = indexCache.get(doc.plantings);
  if (!idx) {
    idx = plantingsIndex(doc);
    indexCache.set(doc.plantings, idx);
  }
  return idx;
}

export function objectPlantingsCached(doc: ProjectDoc, obj: GardenObject, lookup: PlantLookup): PlantingComputation[] {
  const season = doc.settings.activeSeason;
  const plantings = (getPlantingsIndex(doc).get(obj.id) ?? []).filter((p) => p.season === season);
  if (!plantings.length) return [];
  const hit = cache.get(obj.id);
  if (hit && hit.obj === obj && hit.lookup === lookup && hit.season === season && sameList(hit.plantings, plantings)) return hit.result;
  const result = computeObjectPlantings(doc, obj, lookup, season);
  cache.set(obj.id, { obj, plantings, lookup, season, result });
  return result;
}

export function useObjectPlantings(objectId: string | null): PlantingComputation[] {
  const doc = useEditor((s) => s.doc);
  const lookup = usePlantLookup();
  const obj = objectId ? doc?.objects[objectId] : undefined;
  const plantings = doc?.plantings;
  return useMemo(
    () => (doc && obj ? objectPlantingsCached(doc, obj, lookup) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obj, plantings, lookup, doc?.settings.activeSeason],
  );
}

export interface PlantingRow extends PlantingComputation {
  harvest: HarvestEstimate;
  areaM2: number;
}

export function computeRows(doc: ProjectDoc, lookup: PlantLookup, language = 'en'): PlantingRow[] {
  const rows: PlantingRow[] = [];
  for (const layer of doc.layers) {
    for (const id of layer.objectIds) {
      const obj = doc.objects[id];
      if (!obj || !kindInfo(obj.kind).plantable) continue;
      for (const c of objectPlantingsCached(doc, obj, lookup)) {
        const areaM2 = c.capacity.areaMm2 / 1e6;
        rows.push({
          ...c,
          areaM2,
          harvest: calculateExpectedHarvest({ plant: c.plant, quantity: c.quantity, areaM2, override: c.planting.yieldOverride, language }),
        });
      }
    }
  }
  return rows;
}

/** All plantings of the active season with harvest estimates. */
export function usePlantingRows(): PlantingRow[] {
  const doc = useEditor((s) => s.doc);
  const lookup = usePlantLookup();
  return useMemo(() => (doc ? computeRows(doc, lookup) : []), [doc, lookup]);
}
