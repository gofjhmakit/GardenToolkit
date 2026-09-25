/**
 * Climate presets and location helpers.
 *
 * Presets only pre-fill editable project fields. The frost dates below are
 * deliberately rounded editorial approximations with LOW confidence; users
 * should replace them with local observations (in Finland, e.g. from the
 * Finnish Meteorological Institute's climate statistics).
 */
import type { LocationSettings } from '../domain/project';
import type { Plant } from '../plants/schema';
import { isValidMonthDay } from '../lib/dates';

export interface ClimatePreset {
  id: string;
  country: string;
  climateSystem: LocationSettings['climateSystem'];
  zone: string;
  label: string;
  lastFrost: string;
  firstFrost: string;
  note: string;
}

const FI_NOTE =
  'Approximate average frost dates for the Finnish growing zone (editorial estimate, low confidence). Replace with local data.';

export const CLIMATE_PRESETS: ClimatePreset[] = [
  { id: 'fi-I', country: 'Finland', climateSystem: 'finnish-zone', zone: 'I', label: 'Finland – zone I (SW coast & archipelago)', lastFrost: '05-15', firstFrost: '10-01', note: FI_NOTE },
  { id: 'fi-II', country: 'Finland', climateSystem: 'finnish-zone', zone: 'II', label: 'Finland – zone II (southern Finland)', lastFrost: '05-20', firstFrost: '09-25', note: FI_NOTE },
  { id: 'fi-III', country: 'Finland', climateSystem: 'finnish-zone', zone: 'III', label: 'Finland – zone III (southern inland)', lastFrost: '05-25', firstFrost: '09-20', note: FI_NOTE },
  { id: 'fi-IV', country: 'Finland', climateSystem: 'finnish-zone', zone: 'IV', label: 'Finland – zone IV (central Finland)', lastFrost: '05-30', firstFrost: '09-15', note: FI_NOTE },
  { id: 'fi-V', country: 'Finland', climateSystem: 'finnish-zone', zone: 'V', label: 'Finland – zone V (northern central)', lastFrost: '06-05', firstFrost: '09-10', note: FI_NOTE },
  { id: 'fi-VI', country: 'Finland', climateSystem: 'finnish-zone', zone: 'VI', label: 'Finland – zone VI (Oulu region, Kainuu)', lastFrost: '06-10', firstFrost: '09-05', note: FI_NOTE },
  { id: 'fi-VII', country: 'Finland', climateSystem: 'finnish-zone', zone: 'VII', label: 'Finland – zone VII (southern Lapland)', lastFrost: '06-15', firstFrost: '08-31', note: FI_NOTE },
  { id: 'fi-VIII', country: 'Finland', climateSystem: 'finnish-zone', zone: 'VIII', label: 'Finland – zone VIII (northern Lapland)', lastFrost: '06-20', firstFrost: '08-25', note: FI_NOTE },
];

/** Placeholder frost dates used only when a project has none, always flagged in the UI. */
export const PLACEHOLDER_FROST = { lastFrost: '05-15', firstFrost: '09-30' };

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };

export function finnishZoneNumber(zone: string | null | undefined): number | null {
  if (!zone) return null;
  return ROMAN[zone.trim().toUpperCase()] ?? null;
}

export function usdaZoneNumber(zone: string | null | undefined): number | null {
  if (!zone) return null;
  const m = /^(\d{1,2})([ab])?$/i.exec(zone.trim());
  if (!m) return null;
  return Number(m[1]) + (m[2]?.toLowerCase() === 'b' ? 0.5 : 0);
}

export function isSouthernHemisphere(loc: LocationSettings): boolean {
  return loc.latitude != null && loc.latitude < 0;
}

export function frostDates(loc: LocationSettings): { lastFrost: string; firstFrost: string; placeholder: boolean } {
  // Impossible dates (e.g. "13-40" from a hand-edited file) count as missing.
  const last = isValidMonthDay(loc.lastFrost) ? loc.lastFrost : null;
  const first = isValidMonthDay(loc.firstFrost) ? loc.firstFrost : null;
  if (last && first) return { lastFrost: last, firstFrost: first, placeholder: false };
  return {
    lastFrost: last ?? PLACEHOLDER_FROST.lastFrost,
    firstFrost: first ?? PLACEHOLDER_FROST.firstFrost,
    placeholder: true,
  };
}

/** Frost-free days between last spring and first autumn frost (northern pattern). */
export function frostFreeDays(loc: LocationSettings): number | null {
  if (!isValidMonthDay(loc.lastFrost) || !isValidMonthDay(loc.firstFrost)) return null;
  const y = 2001;
  const a = Date.UTC(y, Number(loc.lastFrost.slice(0, 2)) - 1, Number(loc.lastFrost.slice(3)));
  let b = Date.UTC(y, Number(loc.firstFrost.slice(0, 2)) - 1, Number(loc.firstFrost.slice(3)));
  if (b <= a) b = Date.UTC(y + 1, Number(loc.firstFrost.slice(0, 2)) - 1, Number(loc.firstFrost.slice(3)));
  return Math.round((b - a) / 86_400_000);
}

export interface HardinessCheck {
  status: 'ok' | 'warning' | 'unknown';
  message: string;
}

/** Compares a plant's hardiness data with the project's zone, if both exist. */
export function checkHardiness(plant: Plant, loc: LocationSettings): HardinessCheck {
  if (plant.lifecycle === 'annual') return { status: 'ok', message: 'Annual — winter hardiness not relevant.' };
  if (loc.climateSystem === 'finnish-zone') {
    const z = finnishZoneNumber(loc.climateZone);
    const r = plant.growing.finnishZones;
    if (z == null || !r) return { status: 'unknown', message: 'No Finnish zone hardiness data to compare.' };
    if (z > r.max) {
      return {
        status: 'warning',
        message: `Rated for Finnish zones ${r.min}–${r.max}; your garden is in zone ${loc.climateZone}. Winter survival is uncertain.`,
      };
    }
    return { status: 'ok', message: `Rated for Finnish zones up to ${r.max}.` };
  }
  if (loc.climateSystem === 'usda') {
    const z = usdaZoneNumber(loc.climateZone);
    const r = plant.growing.usdaZones;
    if (z == null || !r) return { status: 'unknown', message: 'No USDA zone hardiness data to compare.' };
    if (z < r.min) {
      return {
        status: 'warning',
        message: `Hardy to USDA zone ${r.min}; your garden is zone ${loc.climateZone}. It may not survive winter.`,
      };
    }
    return { status: 'ok', message: `Hardy to USDA zone ${r.min}.` };
  }
  return { status: 'unknown', message: 'Set a climate zone to check hardiness.' };
}
