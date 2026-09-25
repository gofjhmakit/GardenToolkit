import { describe, expect, it } from 'vitest';
import { loadCoreCatalog } from '../test/fixtures';
import { calculateExpectedHarvest, sumHarvest } from './harvest';

describe('calculateExpectedHarvest', () => {
  const catalog = loadCoreCatalog();
  it('multiplies per-plant yield ranges: 20 tomatoes × 2–5 kg = 40–100 kg', () => {
    const e = calculateExpectedHarvest({ plant: catalog.get('solanum-lycopersicum'), quantity: 20, areaM2: 6 });
    expect(e.basis).toBe('per-plant');
    expect(e.total).toEqual({ min: 40, max: 100 });
    expect(e.confidence).toBe('low');
    expect(e.assumptions.length).toBeGreaterThan(0);
  });
  it('falls back to per-m² yield', () => {
    const e = calculateExpectedHarvest({ plant: catalog.get('daucus-carota-sativus'), quantity: 300, areaM2: 3.6 });
    expect(e.basis).toBe('per-m2');
    expect(e.total!.min).toBeCloseTo(7.2);
  });
  it('says "unavailable" rather than inventing numbers', () => {
    const e = calculateExpectedHarvest({ plant: catalog.get('tagetes-patula'), quantity: 10, areaM2: 1 });
    expect(e.total).toBeNull();
    expect(e.unavailableReason).toMatch(/unavailable/);
  });
  it('applies user yield overrides', () => {
    const e = calculateExpectedHarvest({
      plant: catalog.get('solanum-lycopersicum'),
      quantity: 10,
      areaM2: 2,
      override: { basis: 'per-plant', minKg: 3, maxKg: 4 },
    });
    expect(e.basis).toBe('override');
    expect(e.total).toEqual({ min: 30, max: 40 });
  });
  it('sums only available estimates', () => {
    const a = calculateExpectedHarvest({ plant: catalog.get('solanum-lycopersicum'), quantity: 2, areaM2: 1 });
    const b = calculateExpectedHarvest({ plant: catalog.get('tagetes-patula'), quantity: 2, areaM2: 1 });
    expect(sumHarvest([a, b])).toEqual({ total: { min: 4, max: 10 }, included: 1, excluded: 1 });
  });
});
