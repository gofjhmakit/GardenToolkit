/**
 * Site suitability checks (sun, container, hardiness). These produce
 * warnings, never hard blocks.
 */
import type { GardenObject, LocationSettings } from '../domain/project';
import type { Plant, SunLevel } from '../plants/schema';
import { checkHardiness } from './climate';

/** Typical direct-sun hours for each exposure category (common horticultural convention). */
export const SUN_HOURS: Record<SunLevel, { min: number; max: number }> = {
  'full-sun': { min: 6, max: 24 },
  'partial-shade': { min: 3, max: 6 },
  shade: { min: 1, max: 3 },
  'deep-shade': { min: 0, max: 1 },
};

export const SUN_LABEL: Record<SunLevel, string> = {
  'full-sun': 'Full sun',
  'partial-shade': 'Partial shade',
  shade: 'Shade',
  'deep-shade': 'Deep shade',
};

export function sunLevelFromHours(hours: number): SunLevel {
  if (hours >= 6) return 'full-sun';
  if (hours >= 3) return 'partial-shade';
  if (hours >= 1) return 'shade';
  return 'deep-shade';
}

export type CheckStatus = 'ok' | 'warning' | 'unknown';

export interface SuitabilityIssue {
  check: 'sun' | 'hardiness' | 'container';
  status: CheckStatus;
  message: string;
}

/** Minimum direct-sun hours a plant tolerates, from explicit data or its sun categories. */
export function plantMinSunHours(plant: Plant): number | null {
  if (plant.growing.sunHoursMin != null) return plant.growing.sunHoursMin;
  const levels = plant.growing.sun;
  if (!levels || levels.length === 0) return null;
  return Math.min(...levels.map((l) => SUN_HOURS[l].min));
}

export function checkSun(plant: Plant, area: GardenObject): SuitabilityIssue {
  const hours = area.props.sunHours ?? null;
  const level = area.props.sunLevel ?? (hours != null ? sunLevelFromHours(hours) : null);
  const need = plantMinSunHours(plant);
  if (level == null) return { check: 'sun', status: 'unknown', message: 'Sun exposure of this area is not set.' };
  if (need == null) return { check: 'sun', status: 'unknown', message: 'No sunlight data for this plant.' };
  const available = hours ?? SUN_HOURS[level].min;
  const accepted = plant.growing.sun ?? [];
  if (available + 1e-9 < need && !accepted.includes(level)) {
    const wanted = accepted.map((l) => SUN_LABEL[l].toLowerCase()).join(' or ') || `${need}+ h of sun`;
    return {
      check: 'sun',
      status: 'warning',
      message: `Prefers ${wanted} (≈${need}+ h direct sun); this area gets ${hours != null ? `${hours} h` : SUN_LABEL[level].toLowerCase()}. Expect weaker growth and lower yield.`,
    };
  }
  return { check: 'sun', status: 'ok', message: `Sun exposure suits this plant (${SUN_LABEL[level].toLowerCase()}).` };
}

export function checkContainer(plant: Plant, area: GardenObject): SuitabilityIssue | null {
  if (area.kind !== 'planter') return null;
  if (plant.planting.containerSuitable === false) {
    return { check: 'container', status: 'warning', message: 'Not generally recommended for container growing.' };
  }
  if (plant.planting.containerSuitable == null) {
    return { check: 'container', status: 'unknown', message: 'Container suitability unknown.' };
  }
  return { check: 'container', status: 'ok', message: 'Suitable for containers.' };
}

export function checkSuitability(plant: Plant, area: GardenObject, loc: LocationSettings): SuitabilityIssue[] {
  const issues: SuitabilityIssue[] = [checkSun(plant, area)];
  const h = checkHardiness(plant, loc);
  issues.push({ check: 'hardiness', status: h.status, message: h.message });
  const c = checkContainer(plant, area);
  if (c) issues.push(c);
  return issues;
}
