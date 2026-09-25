/**
 * Units.
 *
 * INTERNAL CONVENTION: all world geometry is stored in millimetres (mm) in a
 * right-handed plan coordinate system with +x to the east (right) and +y to
 * the south (down, matching screen space). Zoom never changes stored values;
 * conversion to screen pixels happens only in the view layer and conversion to
 * display units happens only in formatting.
 */

export type UnitSystem = 'metric' | 'imperial';
export type LengthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft';

export const MM_PER: Record<LengthUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
};

export function toMm(value: number, unit: LengthUnit): number {
  return value * MM_PER[unit];
}

export function fromMm(mm: number, unit: LengthUnit): number {
  return mm / MM_PER[unit];
}

export function mm2ToM2(mm2: number): number {
  return mm2 / 1_000_000;
}

export function m2ToMm2(m2: number): number {
  return m2 * 1_000_000;
}

const M2_PER_FT2 = 0.09290304;

function fmt(n: number, digits: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Chooses a sensible unit for a length and formats it. */
export function formatLength(mm: number, system: UnitSystem = 'metric', unit?: LengthUnit): string {
  if (!Number.isFinite(mm)) return '—';
  if (system === 'imperial' && !unit) {
    const inches = mm / MM_PER.in;
    if (Math.abs(inches) < 24) return `${fmt(inches, 1)} in`;
    const feet = Math.trunc(inches / 12);
    const rest = Math.abs(inches - feet * 12);
    return `${feet}′ ${fmt(rest, 1)}″`;
  }
  const u = unit ?? (Math.abs(mm) >= 1000 ? 'm' : Math.abs(mm) >= 10 ? 'cm' : 'mm');
  const value = fromMm(mm, u);
  const digits = u === 'm' ? 2 : u === 'cm' ? (Number.isInteger(Math.round(value * 10) / 10) ? 0 : 1) : 0;
  return `${fmt(value, digits)} ${u}`;
}

export function formatArea(mm2: number, system: UnitSystem = 'metric'): string {
  if (!Number.isFinite(mm2)) return '—';
  const m2 = mm2ToM2(mm2);
  if (system === 'imperial') return `${fmt(m2 / M2_PER_FT2, 1)} ft²`;
  return `${fmt(m2, m2 < 10 ? 2 : 1)} m²`;
}

export function formatVolumeLitres(mm3: number): string {
  const litres = mm3 / 1_000_000;
  if (litres >= 1000) return `${fmt(litres / 1000, 2)} m³`;
  return `${fmt(litres, 0)} L`;
}

const UNIT_ALIASES: Record<string, LengthUnit> = {
  mm: 'mm',
  millimetre: 'mm',
  millimeter: 'mm',
  millimetres: 'mm',
  millimeters: 'mm',
  cm: 'cm',
  centimetre: 'cm',
  centimeter: 'cm',
  centimetres: 'cm',
  centimeters: 'cm',
  m: 'm',
  metre: 'm',
  meter: 'm',
  metres: 'm',
  meters: 'm',
  in: 'in',
  inch: 'in',
  inches: 'in',
  '"': 'in',
  '″': 'in',
  ft: 'ft',
  foot: 'ft',
  feet: 'ft',
  "'": 'ft',
  '′': 'ft',
};

/**
 * Parses user-entered lengths such as "3", "3 m", "120cm", "2,5 m" (comma
 * decimal, common in Finland) or "10'". Returns millimetres or null when the
 * input is not understood. A bare number is interpreted in `defaultUnit`.
 */
export function parseLength(input: string, defaultUnit: LengthUnit = 'm'): number | null {
  const s = input.trim().toLowerCase().replace(',', '.');
  if (!s) return null;
  const match = /^(-?\d+(?:\.\d+)?|-?\.\d+)\s*([a-z"'″′]*)$/.exec(s);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const unitText = match[2];
  const unit = unitText ? UNIT_ALIASES[unitText] : defaultUnit;
  if (!unit) return null;
  return toMm(value, unit);
}

/** Preferred unit for inputs of a given magnitude in the chosen system. */
export function inputUnit(system: UnitSystem, magnitude: 'small' | 'large'): LengthUnit {
  if (system === 'imperial') return magnitude === 'small' ? 'in' : 'ft';
  return magnitude === 'small' ? 'cm' : 'm';
}
