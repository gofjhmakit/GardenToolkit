/**
 * Planting capacity calculation.
 *
 * Deliberately NOT `area / spacing²`. Plants are laid out on the actual
 * region geometry: rows (or grid lines) are placed across the region with an
 * edge margin, each row is intersected with the polygon, and plant stations
 * are counted along the resulting row segments. This gives realistic results
 * for narrow beds, circles and irregular polygons, and lets the UI draw the
 * same positions it counted.
 *
 * Every result carries a human-readable explanation of how it was derived.
 */
import {
  boundsOfPoints,
  distToPolyline,
  polygonArea,
  type Vec,
} from '../domain/geometry';
import { midpoint, type Range } from '../domain/range';
import { formatArea, formatLength, formatNumber } from '../domain/units';
import { t } from '../i18n';
import type { PlantingMethod } from '../plants/schema';

export type LayoutPattern = 'square' | 'triangular';

/** Spacing rules in millimetres, already resolved from plant data + overrides. */
export interface PlantingRules {
  method: PlantingMethod;
  /** Distance between plants in a row (or grid spacing for grid method). */
  inRowMm: Range | null;
  /** Distance between rows. */
  rowMm: Range | null;
  /** Seed spacing when direct sowing before thinning. */
  seedMm?: Range | null;
  /** Explicit edge margin; default is half the relevant spacing. */
  edgeMarginMm?: number | null;
  pattern?: LayoutPattern;
  seedsPerStation?: Range | null;
  germinationRate?: Range | null;
  seedRateGPerM2?: Range | null;
  seedsPerGram?: Range | null;
}

export interface CapacityInput {
  /** Region polygon in the host object's local frame (mm). */
  region: Vec[];
  /** Local axis along which rows run. 'auto' = along the longer extent. */
  rowAxis?: 'x' | 'y' | 'auto';
  rules: PlantingRules;
  /** Host is a single-plant object such as a tree or shrub symbol. */
  singlePlantHost?: boolean;
  /** Maximum number of positions to return for drawing. */
  maxPositions?: number;
}

export interface CapacityResult {
  method: PlantingMethod;
  areaMm2: number;
  /** Best estimate using the preferred (mid-range) spacing; null when not computable. */
  plants: number | null;
  /** Range across the spacing range (widest spacing → fewest plants). */
  plantsRange: Range | null;
  rows: number | null;
  plantsPerRow: number | null;
  totalRowLengthMm: number | null;
  seeds: Range | null;
  seedGrams: Range | null;
  inRowMm: number | null;
  rowMm: number | null;
  rowAxis: 'x' | 'y';
  /** Plant positions (local frame) for drawing; may be truncated. */
  positions: Vec[];
  positionsTruncated: boolean;
  /** Row lines (local frame) for drawing row crops. */
  rowLines: [Vec, Vec][];
  explanation: string[];
  warnings: string[];
}

interface LatticeResult {
  count: number;
  rows: number;
  rowLengthMm: number;
  positions: Vec[];
  truncated: boolean;
  rowLines: [Vec, Vec][];
  maxRowCount: number;
}

/**
 * x-intervals where the horizontal line y = c lies inside the polygon
 * (after rotating so rows run along x).
 */
function scanlineIntervals(poly: Vec[], c: number): [number, number][] {
  const xs: number[] = [];
  for (let i = 0, n = poly.length; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    if ((a.y <= c && b.y > c) || (b.y <= c && a.y > c)) {
      xs.push(a.x + ((c - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
  }
  xs.sort((p, q) => p - q);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}

/**
 * Counts plant stations on a row lattice inside a polygon whose rows run
 * along +x. Pure function; `maxPositions` bounds memory for huge areas.
 */
export function countLattice(
  poly: Vec[],
  inRow: number,
  rowSpacing: number,
  marginAlong: number,
  marginAcross: number,
  pattern: LayoutPattern,
  maxPositions: number,
): LatticeResult {
  const b = boundsOfPoints(poly);
  const positions: Vec[] = [];
  const rowLines: [Vec, Vec][] = [];
  let count = 0;
  let rows = 0;
  let rowLengthMm = 0;
  let maxRowCount = 0;
  let truncated = false;
  const edgeTol = Math.min(marginAlong, marginAcross) - 1e-6;
  const first = b.minY + marginAcross;
  const last = b.maxY - marginAcross;
  if (inRow <= 0 || rowSpacing <= 0 || last < first - 1e-9) {
    return { count: 0, rows: 0, rowLengthMm: 0, positions, truncated, rowLines, maxRowCount };
  }
  const rowCount = Math.floor((last - first) / rowSpacing + 1e-9) + 1;
  // Centre the rows across the available width so leftover space is split evenly.
  const used = (rowCount - 1) * rowSpacing;
  const offset = first + (last - first - used) / 2;
  for (let r = 0; r < rowCount; r++) {
    const c = offset + r * rowSpacing;
    const shift = pattern === 'triangular' && r % 2 === 1 ? inRow / 2 : 0;
    let rowHasPlants = false;
    let rowCountHere = 0;
    // Rows lying exactly on the outline (zero margin) are evaluated just inside it.
    const cEval = Math.min(Math.max(c, b.minY + 1e-6), b.maxY - 1e-6);
    for (const [x0, x1] of scanlineIntervals(poly, cEval)) {
      const s0 = x0 + marginAlong;
      const s1 = x1 - marginAlong;
      if (s1 < s0 - 1e-9) continue;
      const n = Math.floor((s1 - s0 - shift) / inRow + 1e-9) + 1;
      if (n <= 0) continue;
      const usedAlong = (n - 1) * inRow;
      const start = s0 + shift + (s1 - s0 - shift - usedAlong) / 2;
      let segCount = 0;
      for (let k = 0; k < n; k++) {
        const p = { x: start + k * inRow, y: c };
        // Reject stations too close to slanted/curved edges.
        if (edgeTol > 0 && distToPolyline(p, poly, true) < edgeTol) continue;
        segCount++;
        if (positions.length < maxPositions) positions.push(p);
        else truncated = true;
      }
      if (segCount > 0) {
        rowHasPlants = true;
        rowCountHere += segCount;
        rowLengthMm += s1 - s0;
        rowLines.push([
          { x: s0, y: c },
          { x: s1, y: c },
        ]);
      }
    }
    if (rowHasPlants) rows++;
    count += rowCountHere;
    maxRowCount = Math.max(maxRowCount, rowCountHere);
  }
  return { count, rows, rowLengthMm, positions, truncated, rowLines, maxRowCount };
}

function rotatePoly(poly: Vec[], swap: boolean): Vec[] {
  // Rows along local y ⇒ swap axes so the lattice code can always work along x.
  return swap ? poly.map((p) => ({ x: p.y, y: p.x })) : poly;
}

function unrotate(p: Vec, swap: boolean): Vec {
  return swap ? { x: p.y, y: p.x } : p;
}

const fmtL = (mm: number) => formatLength(mm);

/** Upper bound of lattice stations evaluated per spacing variant before falling back to an estimate. */
export const MAX_LAYOUT_STATIONS = 400_000;

export function resolveRowAxis(region: Vec[], rowAxis: 'x' | 'y' | 'auto' = 'auto'): 'x' | 'y' {
  if (rowAxis !== 'auto') return rowAxis;
  const b = boundsOfPoints(region);
  return b.maxX - b.minX >= b.maxY - b.minY ? 'x' : 'y';
}

function emptyResult(method: PlantingMethod, areaMm2: number, rowAxis: 'x' | 'y'): CapacityResult {
  return {
    method,
    areaMm2,
    plants: null,
    plantsRange: null,
    rows: null,
    plantsPerRow: null,
    totalRowLengthMm: null,
    seeds: null,
    seedGrams: null,
    inRowMm: null,
    rowMm: null,
    rowAxis,
    positions: [],
    positionsTruncated: false,
    rowLines: [],
    explanation: [],
    warnings: [],
  };
}

function seedEstimate(
  rules: PlantingRules,
  plants: Range,
  rowLengthMm: number | null,
  result: CapacityResult,
): void {
  const ex = result.explanation;
  if (rules.method === 'rows' && rules.seedMm && rowLengthMm && rowLengthMm > 0) {
    const seeds = {
      min: Math.round(rowLengthMm / rules.seedMm.max),
      max: Math.round(rowLengthMm / rules.seedMm.min),
    };
    result.seeds = seeds;
    ex.push(
      t('Seeds: {{length}} of row sown every {{min}}–{{max}} ≈ {{seedsMin}}–{{seedsMax}} seeds, thinned to the plant spacing.', { length: fmtL(rowLengthMm), min: fmtL(rules.seedMm.min), max: fmtL(rules.seedMm.max), seedsMin: formatNumber(seeds.min), seedsMax: formatNumber(seeds.max) }),
    );
  } else if (rules.seedsPerStation) {
    result.seeds = {
      min: Math.round(plants.min * rules.seedsPerStation.min),
      max: Math.round(plants.max * rules.seedsPerStation.max),
    };
    ex.push(
      t('Seeds: {{min}}–{{max}} seeds per station ⇒ {{seedsMin}}–{{seedsMax}} seeds.', { min: rules.seedsPerStation.min, max: rules.seedsPerStation.max, seedsMin: formatNumber(result.seeds.min), seedsMax: formatNumber(result.seeds.max) }),
    );
  } else if (rules.germinationRate && rules.germinationRate.min > 0) {
    result.seeds = {
      min: Math.ceil(plants.min / rules.germinationRate.max),
      max: Math.ceil(plants.max / rules.germinationRate.min),
    };
    ex.push(
      t('Seeds: allowing for {{min}}–{{max}}% germination.', { min: Math.round(rules.germinationRate.min * 100), max: Math.round(rules.germinationRate.max * 100) }),
    );
  }
  if (result.seeds && rules.seedsPerGram && rules.seedsPerGram.min > 0) {
    result.seedGrams = {
      min: result.seeds.min / rules.seedsPerGram.max,
      max: result.seeds.max / rules.seedsPerGram.min,
    };
  }
}

/**
 * Main entry point: how many plants of a kind fit into a region.
 * Deterministic and free of UI concerns.
 */
export function calculatePlantCapacity(input: CapacityInput): CapacityResult {
  const { region, rules } = input;
  const areaMm2 = polygonArea(region);
  const axis = resolveRowAxis(region, input.rowAxis);
  const result = emptyResult(rules.method, areaMm2, axis);
  const ex = result.explanation;
  const maxPositions = input.maxPositions ?? 4000;
  const b = boundsOfPoints(region);
  const along = axis === 'x' ? b.maxX - b.minX : b.maxY - b.minY;
  const across = axis === 'x' ? b.maxY - b.minY : b.maxX - b.minX;

  if (region.length < 3 || !(areaMm2 > 0) || !Number.isFinite(areaMm2) || !Number.isFinite(along) || !Number.isFinite(across)) {
    result.warnings.push(t('The area has no measurable size.'));
    return result;
  }
  ex.push(t('Area: {{area}} (extent {{along}} × {{across}}).', { area: formatArea(areaMm2), along: fmtL(along), across: fmtL(across) }));

  if (input.singlePlantHost) {
    result.plants = 1;
    result.plantsRange = { min: 1, max: 1 };
    result.positions = [{ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }];
    ex.push(t('This object represents a single plant (tree or shrub symbol).'));
    if (rules.inRowMm) {
      const need = rules.inRowMm.min;
      if (need > Math.min(along, across) * 1.05) {
        result.warnings.push(
          t('Drawn footprint ({{size}}) is smaller than the recommended spacing ({{need}}); the mature plant may need more room.', { size: fmtL(Math.min(along, across)), need: fmtL(need) }),
        );
      }
    }
    seedEstimate(rules, { min: 1, max: 1 }, null, result);
    return result;
  }

  if (rules.method === 'broadcast') {
    ex.push('Broadcast/area sowing: seed is spread over the whole area rather than placed at stations.');
    if (rules.seedRateGPerM2) {
      const m2 = areaMm2 / 1e6;
      result.seedGrams = { min: rules.seedRateGPerM2.min * m2, max: rules.seedRateGPerM2.max * m2 };
      ex.push(
        t('Seed: {{min}}–{{max}} g/m² × {{area}} m² = {{gMin}}–{{gMax}} g.', { min: formatNumber(rules.seedRateGPerM2.min), max: formatNumber(rules.seedRateGPerM2.max), area: formatNumber(m2), gMin: formatNumber(result.seedGrams.min, 0), gMax: formatNumber(result.seedGrams.max, 0) }),
      );
    } else {
      result.warnings.push(t('No sowing-rate data is available for broadcast sowing; enter a quantity manually.'));
    }
    if (rules.inRowMm) {
      // A density figure exists: estimate a plant count from it (area / spacing²).
      const dens = (s: number) => Math.floor(areaMm2 / (s * s));
      result.plantsRange = { min: dens(rules.inRowMm.max), max: dens(rules.inRowMm.min) };
      result.plants = dens(midpoint(rules.inRowMm));
      ex.push(t('Density estimate at {{spacing}} average spacing ≈ {{count}} plants.', { spacing: fmtL(midpoint(rules.inRowMm)), count: result.plants }));
    }
    return result;
  }

  const inRow = rules.inRowMm;
  if (!inRow) {
    result.warnings.push(t('No spacing data for this plant — enter a spacing to calculate quantities.'));
    ex.push(t('Quantity cannot be calculated without spacing information.'));
    return result;
  }
  const isGrid = rules.method === 'grid' || rules.method === 'individual';
  const pattern: LayoutPattern = rules.pattern ?? 'square';
  let rowR: Range;
  if (rules.rowMm && !isGrid) rowR = rules.rowMm;
  else if (pattern === 'triangular') rowR = { min: (inRow.min * Math.sqrt(3)) / 2, max: (inRow.max * Math.sqrt(3)) / 2 };
  else rowR = inRow;

  // Laying out every station is linear in the plant count and runs on the main thread.
  // Beyond a field-sized area, fall back to an area ÷ spacing estimate so a typo such as
  // "3000 m" (or a hostile imported file) cannot freeze the app.
  const stationsUpperBound = (along / inRow.min + 1) * (across / rowR.min + 1);
  if (!(stationsUpperBound <= MAX_LAYOUT_STATIONS)) {
    const perArea = (sIn: number, sRow: number) => Math.floor(areaMm2 / (sIn * sRow));
    result.inRowMm = midpoint(inRow);
    result.rowMm = midpoint(rowR);
    result.plants = perArea(result.inRowMm, result.rowMm);
    result.plantsRange = { min: perArea(inRow.max, rowR.max), max: perArea(inRow.min, rowR.min) };
    ex.push(
      t('The area is too large for a plant-by-plant layout; the quantity is estimated as area ÷ ({{inRow}} × {{row}}) ≈ {{count}} plants, without edge margins.', { inRow: fmtL(result.inRowMm), row: fmtL(result.rowMm), count: formatNumber(result.plants) }),
    );
    result.warnings.push(t('Very large area: the quantity is a rough area-based estimate and plant markers are not drawn. Check the object size if this is unexpected.'));
    seedEstimate(rules, result.plantsRange, null, result);
    return result;
  }

  const poly = rotatePoly(region, axis === 'y');
  const compute = (sIn: number, sRow: number, maxPos: number) => {
    const mAlong = rules.edgeMarginMm ?? sIn / 2;
    // Grid plants need half their spacing of clearance in every direction, even when
    // a triangular pattern packs the rows closer than the plant spacing.
    const mAcross = rules.edgeMarginMm ?? (isGrid ? sIn / 2 : sRow / 2);
    return { lat: countLattice(poly, sIn, sRow, mAlong, mAcross, pattern, maxPos), mAlong, mAcross };
  };

  const prefIn = midpoint(inRow);
  const prefRow = midpoint(rowR);
  const pref = compute(prefIn, prefRow, maxPositions);
  const dense = compute(inRow.min, rowR.min, 0);
  const sparse = compute(inRow.max, rowR.max, 0);

  result.inRowMm = prefIn;
  result.rowMm = prefRow;
  result.plants = pref.lat.count;
  result.plantsRange = { min: Math.min(sparse.lat.count, pref.lat.count), max: Math.max(dense.lat.count, pref.lat.count) };
  result.rows = pref.lat.rows;
  result.plantsPerRow = pref.lat.maxRowCount;
  result.totalRowLengthMm = pref.lat.rowLengthMm;
  result.positions = pref.lat.positions.map((p) => unrotate(p, axis === 'y'));
  result.positionsTruncated = pref.lat.truncated;
  result.rowLines = pref.lat.rowLines.map(([p, q]) => [unrotate(p, axis === 'y'), unrotate(q, axis === 'y')]);

  const dir = axis === 'x' ? t('along the local x (length) direction') : t('along the local y direction');
  if (isGrid) {
    ex.push(
      pattern === 'triangular'
        ? t('Triangular (offset) grid at {{spacing}} spacing (rows {{row}} apart), keeping {{margin}} from the edges.', { spacing: fmtL(prefIn), row: fmtL(prefRow), margin: fmtL(pref.mAlong) })
        : t('Square grid at {{spacing}} spacing, keeping {{margin}} from the edges.', { spacing: fmtL(prefIn), margin: fmtL(pref.mAlong) }),
    );
    ex.push(t('{{rows}} grid rows, up to {{perRow}} plants each ⇒ {{count}} plants.', { rows: pref.lat.rows, perRow: pref.lat.maxRowCount, count: pref.lat.count }));
  } else {
    ex.push(
      t('Rows run {{dir}}: {{rows}} rows {{row}} apart across {{across}}, outer rows {{margin}} from the edge.', { dir, rows: pref.lat.rows, row: fmtL(prefRow), across: fmtL(across), margin: fmtL(pref.mAcross) }),
    );
    ex.push(
      t('In each row plants are {{spacing}} apart, {{margin}} from the row ends: up to {{perRow}} per row ⇒ {{count}} plants.', { spacing: fmtL(prefIn), margin: fmtL(pref.mAlong), perRow: pref.lat.maxRowCount, count: pref.lat.count }),
    );
  }
  if (inRow.min !== inRow.max || rowR.min !== rowR.max) {
    ex.push(
      isGrid
        ? t('Using the full spacing range ({{min}}–{{max}}) the bed holds {{pMin}}–{{pMax}} plants.', { min: fmtL(inRow.min), max: fmtL(inRow.max), pMin: result.plantsRange.min, pMax: result.plantsRange.max })
        : t('Using the full spacing range ({{min}}–{{max}}, rows {{rMin}}–{{rMax}}) the bed holds {{pMin}}–{{pMax}} plants.', { min: fmtL(inRow.min), max: fmtL(inRow.max), rMin: fmtL(rowR.min), rMax: fmtL(rowR.max), pMin: result.plantsRange.min, pMax: result.plantsRange.max }),
    );
  }
  if (pref.lat.count === 0) {
    result.warnings.push(t('The area is too small for even one plant at the recommended spacing.'));
  }
  seedEstimate(
    rules,
    result.plantsRange,
    rules.method === 'rows' ? pref.lat.rowLengthMm : null,
    result,
  );
  return result;
}
