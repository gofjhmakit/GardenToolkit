/**
 * A numeric range. Sources frequently disagree or give spans ("40–60 cm"),
 * so horticultural quantities are stored as ranges instead of fake-precise
 * single values. A single value is represented as `min === max`.
 */
export interface Range {
  min: number;
  max: number;
}

export function range(min: number, max: number = min): Range {
  return min <= max ? { min, max } : { min: max, max: min };
}

export function midpoint(r: Range): number {
  return (r.min + r.max) / 2;
}

export function scaleRange(r: Range, factor: number): Range {
  return range(r.min * factor, r.max * factor);
}

export function addRanges(a: Range, b: Range): Range {
  return { min: a.min + b.min, max: a.max + b.max };
}

export function isPoint(r: Range): boolean {
  return r.min === r.max;
}

export function formatRange(r: Range, digits = 0, unit = ''): string {
  const f = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  const suffix = unit ? ` ${unit}` : '';
  return isPoint(r) || f(r.min) === f(r.max) ? `${f(r.min)}${suffix}` : `${f(r.min)}–${f(r.max)}${suffix}`;
}
