/**
 * Harvest estimation. Returns ranges with the basis and assumptions used;
 * returns `total: null` when there is no meaningful data rather than
 * inventing a number.
 */
import { addRanges, type Range } from '../domain/range';
import type { Confidence, Plant } from '../plants/schema';
import type { Planting } from '../domain/project';

export interface HarvestEstimate {
  total: Range | null;
  basis: 'override' | 'per-plant' | 'per-m2' | 'none';
  perPlant: Range | null;
  perM2: Range | null;
  confidence: Confidence;
  assumptions: string[];
  unavailableReason: string | null;
}

export interface HarvestInput {
  plant: Plant | undefined;
  quantity: number | null;
  areaM2: number;
  override?: Planting['yieldOverride'];
  language?: string;
}

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 1 : 0 });

export function calculateExpectedHarvest(input: HarvestInput): HarvestEstimate {
  const { plant, quantity, areaM2, override } = input;
  const y = plant?.yield ?? null;
  const base: HarvestEstimate = {
    total: null,
    basis: 'none',
    perPlant: y?.perPlantKg ?? null,
    perM2: y?.perM2Kg ?? null,
    confidence: y?.confidence ?? 'unknown',
    assumptions: [],
    unavailableReason: null,
  };
  const lang = input.language ?? 'en';
  const dataNote = y?.assumptions?.[lang] ?? y?.assumptions?.en;

  if (override) {
    const r = { min: override.minKg, max: Math.max(override.minKg, override.maxKg) };
    let total: Range;
    if (override.basis === 'total') total = r;
    else if (override.basis === 'per-plant') {
      if (quantity == null) return { ...base, unavailableReason: 'Per-plant yield set, but plant quantity is unknown.' };
      total = { min: r.min * quantity, max: r.max * quantity };
    } else total = { min: r.min * areaM2, max: r.max * areaM2 };
    return {
      ...base,
      total,
      basis: 'override',
      confidence: 'unknown',
      assumptions: [`User-specified yield (${override.basis}): ${fmt(r.min)}–${fmt(r.max)} kg.`],
    };
  }

  if (!y || (!y.perPlantKg && !y.perM2Kg)) {
    return { ...base, unavailableReason: 'Yield estimate unavailable — no reliable yield data for this plant.' };
  }

  if (y.perPlantKg && quantity != null && quantity > 0) {
    const total = { min: y.perPlantKg.min * quantity, max: y.perPlantKg.max * quantity };
    const assumptions = [`${fmt(y.perPlantKg.min)}–${fmt(y.perPlantKg.max)} kg per plant × ${quantity} plants.`];
    if (dataNote) assumptions.push(dataNote);
    return { ...base, total, basis: 'per-plant', assumptions };
  }
  if (y.perM2Kg && areaM2 > 0) {
    const total = { min: y.perM2Kg.min * areaM2, max: y.perM2Kg.max * areaM2 };
    const assumptions = [`${fmt(y.perM2Kg.min)}–${fmt(y.perM2Kg.max)} kg/m² × ${areaM2.toFixed(2)} m².`];
    if (dataNote) assumptions.push(dataNote);
    return { ...base, total, basis: 'per-m2', assumptions };
  }
  return { ...base, unavailableReason: 'Yield data exists per plant, but the plant quantity is unknown.' };
}

/** Sums estimates, skipping unavailable ones; reports how many were included. */
export function sumHarvest(estimates: HarvestEstimate[]): { total: Range | null; included: number; excluded: number } {
  let total: Range | null = null;
  let included = 0;
  let excluded = 0;
  for (const e of estimates) {
    if (e.total) {
      total = total ? addRanges(total, e.total) : e.total;
      included++;
    } else excluded++;
  }
  return { total, included, excluded };
}
