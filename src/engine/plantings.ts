/**
 * Resolves project plantings into calculation inputs and results:
 * merges plant reference data with project-specific overrides, divides host
 * areas between plantings, and runs the capacity calculation.
 */
import { shapeToPolygon, splitPolygonByShares, type Vec } from '../domain/geometry';
import type { GardenObject, Planting, ProjectDoc } from '../domain/project';
import { plantingsForObject } from '../domain/projectFactory';
import { kindInfo } from '../domain/objectKinds';
import { scaleRange, type Range } from '../domain/range';
import type { Plant, PlantingMethod } from '../plants/schema';
import { calculatePlantCapacity, resolveRowAxis, type CapacityResult, type PlantingRules } from './capacity';

export type PlantLookup = (id: string) => Plant | undefined;

const cmToMm = (r: Range | null | undefined): Range | null => (r ? scaleRange(r, 10) : null);
const exactMm = (v: number | null | undefined): Range | null => (v != null && v > 0 ? { min: v, max: v } : null);

export function defaultMethod(plant: Plant | undefined, host?: GardenObject): PlantingMethod {
  if (host && (host.kind === 'tree' || host.kind === 'shrub')) return 'individual';
  const m = plant?.planting.methods[0];
  return m ?? 'spaced';
}

export function effectiveMethod(planting: Planting, plant: Plant | undefined, host?: GardenObject): PlantingMethod {
  return planting.method ?? defaultMethod(plant, host);
}

/** Merges plant reference spacing with planting overrides into mm rules. */
export function resolveRules(planting: Planting, plant: Plant | undefined, host?: GardenObject): PlantingRules {
  const method = effectiveMethod(planting, plant, host);
  const p = plant?.planting;
  let inRow: Range | null;
  if (method === 'grid') inRow = cmToMm(p?.gridSpacingCm) ?? cmToMm(p?.inRowSpacingCm);
  else if (method === 'individual') inRow = cmToMm(p?.inRowSpacingCm) ?? cmToMm(p?.matureWidthCm);
  else inRow = cmToMm(p?.inRowSpacingCm) ?? cmToMm(p?.gridSpacingCm);
  const s = planting.spacing;
  return {
    method,
    inRowMm: exactMm(s.inRowMm) ?? inRow,
    rowMm: exactMm(s.rowMm) ?? cmToMm(p?.rowSpacingCm),
    seedMm: exactMm(s.seedMm) ?? cmToMm(p?.seedSpacingCm),
    edgeMarginMm: s.edgeMarginMm ?? null,
    pattern: s.pattern ?? 'square',
    seedsPerStation: p?.seedsPerStation ?? null,
    germinationRate: p?.germinationRate ?? null,
    seedRateGPerM2: p?.seedRateGPerM2 ?? null,
    seedsPerGram: p?.seedsPerGram ?? null,
  };
}

/** Effective area shares for the plantings of one host object (sum ≤ 1). */
export function resolveShares(plantings: Planting[]): { shares: Map<string, number>; warning: string | null } {
  const shares = new Map<string, number>();
  const explicit = plantings.filter((p) => p.areaShare != null);
  const auto = plantings.filter((p) => p.areaShare == null);
  let explicitSum = explicit.reduce((s, p) => s + (p.areaShare ?? 0), 0);
  let warning: string | null = null;
  if (explicitSum > 1 + 1e-9) {
    warning = `Area shares add up to ${Math.round(explicitSum * 100)}%; they have been scaled to fit.`;
    for (const p of explicit) shares.set(p.id, (p.areaShare ?? 0) / explicitSum);
    explicitSum = 1;
  } else {
    for (const p of explicit) shares.set(p.id, p.areaShare ?? 0);
  }
  const remaining = Math.max(0, 1 - explicitSum);
  for (const p of auto) shares.set(p.id, auto.length ? remaining / auto.length : 0);
  return { shares, warning };
}

export interface PlantingComputation {
  planting: Planting;
  plant: Plant | undefined;
  host: GardenObject;
  share: number;
  /** Region polygon in host local coordinates. */
  region: Vec[];
  rules: PlantingRules;
  capacity: CapacityResult;
  /** Final quantity: user override if set, else calculated. */
  quantity: number | null;
  quantitySource: 'override' | 'calculated' | 'unknown';
  warnings: string[];
}

function isSinglePlantHost(host: GardenObject): boolean {
  return host.kind === 'tree' || host.kind === 'shrub';
}

/**
 * Computes all plantings of an object for a season. Plantings share the
 * object by splitting it into bands across the row direction, in the order
 * the plantings were created.
 */
export function computeObjectPlantings(
  doc: ProjectDoc,
  host: GardenObject,
  lookup: PlantLookup,
  season = doc.settings.activeSeason,
): PlantingComputation[] {
  const plantings = plantingsForObject(doc, host.id, season).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (plantings.length === 0) return [];
  const poly = shapeToPolygon(host.shape) ?? [];
  const { shares, warning } = resolveShares(plantings);
  const shareList = plantings.map((p) => shares.get(p.id) ?? 0);
  const rowAxis = host.props.rowAxis ?? 'auto';
  const axis = resolveRowAxis(poly, rowAxis);
  // Bands are split along the row direction so each planting gets full-width rows.
  const splitAxis = axis;
  const totalShare = shareList.reduce((s, v) => s + v, 0);
  // If shares do not fill the whole object, add an unallocated band at the end.
  const bandShares = totalShare < 1 - 1e-6 ? [...shareList, 1 - totalShare] : shareList;
  const bands =
    poly.length >= 3 && !isSinglePlantHost(host) ? splitPolygonByShares(poly, bandShares, splitAxis) : plantings.map(() => poly);
  return plantings.map((planting, i) => {
    const plant = lookup(planting.plantId);
    const rules = resolveRules(planting, plant, host);
    const region = bands[i] ?? [];
    const capacity = calculatePlantCapacity({
      region,
      rowAxis: axis,
      rules,
      singlePlantHost: isSinglePlantHost(host),
    });
    const warnings = [...capacity.warnings];
    if (warning && i === 0) warnings.push(warning);
    if (!plant) warnings.push('Plant record not found in the database; showing stored project values only.');
    const quantity = planting.quantityOverride ?? capacity.plants;
    return {
      planting,
      plant,
      host,
      share: shareList[i],
      region,
      rules,
      capacity,
      quantity,
      quantitySource: planting.quantityOverride != null ? 'override' : capacity.plants != null ? 'calculated' : 'unknown',
      warnings,
    };
  });
}

/** All plantings of the active season, grouped by host object. */
export function computeAllPlantings(doc: ProjectDoc, lookup: PlantLookup, season = doc.settings.activeSeason) {
  const out: PlantingComputation[] = [];
  for (const obj of Object.values(doc.objects)) {
    if (!kindInfo(obj.kind).plantable) continue;
    out.push(...computeObjectPlantings(doc, obj, lookup, season));
  }
  return out;
}
