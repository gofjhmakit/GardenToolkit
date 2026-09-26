/**
 * Harvest estimation. Returns ranges with the basis and assumptions used;
 * returns `total: null` when there is no meaningful data rather than
 * inventing a number.
 */
import { addRanges, type Range } from '../domain/range';
import { formatNumber } from '../domain/units';
import { language, t } from '../i18n';
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

const fmt = (n: number) => formatNumber(n, n < 10 ? 1 : 0);

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
  const lang = input.language ?? language();
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
      assumptions: [t('User-specified yield ({{basis}}): {{min}}–{{max}} kg.', { basis: t(override.basis), min: fmt(r.min), max: fmt(r.max) })],
    };
  }

  if (!y || (!y.perPlantKg && !y.perM2Kg)) {
    return { ...base, unavailableReason: t('Yield estimate unavailable — no reliable yield data for this plant.') };
  }

  if (y.perPlantKg && quantity != null && quantity > 0) {
    const total = { min: y.perPlantKg.min * quantity, max: y.perPlantKg.max * quantity };
    const assumptions = [t('{{min}}–{{max}} kg per plant × {{count}} plants.', { min: fmt(y.perPlantKg.min), max: fmt(y.perPlantKg.max), count: quantity })];
    if (dataNote) assumptions.push(dataNote);
    return { ...base, total, basis: 'per-plant', assumptions };
  }
  if (y.perM2Kg && areaM2 > 0) {
    const total = { min: y.perM2Kg.min * areaM2, max: y.perM2Kg.max * areaM2 };
    const assumptions = [t('{{min}}–{{max}} kg/m² × {{area}} m².', { min: fmt(y.perM2Kg.min), max: fmt(y.perM2Kg.max), area: formatNumber(areaM2) })];
    if (dataNote) assumptions.push(dataNote);
    return { ...base, total, basis: 'per-m2', assumptions };
  }
  return { ...base, unavailableReason: t('Yield data exists per plant, but the plant quantity is unknown.') };
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
