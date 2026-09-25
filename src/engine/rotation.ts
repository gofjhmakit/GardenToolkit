/**
 * Crop rotation analysis. Rotation guidance (interval per crop group) is
 * data (RotationRule), not code, because intervals differ by crop group and
 * by the problem being avoided (clubroot, potato cyst nematode, white rot…).
 */
import type { ProjectDoc } from '../domain/project';
import { kindInfo } from '../domain/objectKinds';
import type { Range } from '../domain/range';
import type { RotationGroup, RotationRule } from '../plants/schema';
import type { PlantLookup } from './plantings';
import { plantDisplayName } from '../plants/names';

/**
 * A conventional four-course sequence (potatoes → legumes → brassicas →
 * roots). One of several valid schemes; used only for suggestions.
 */
export const ROTATION_SEQUENCE: RotationGroup[] = ['solanaceae', 'legumes', 'brassicas', 'roots'];

/** Groups that ride along with a main course in the sequence above. */
const COURSE_OF: Partial<Record<RotationGroup, RotationGroup>> = {
  alliums: 'legumes',
  cucurbits: 'solanaceae',
  leafy: 'brassicas',
};

export interface RotationEntry {
  season: number;
  group: RotationGroup;
  crops: string[];
  source: 'planting' | 'history';
}

export interface RotationIssue {
  objectId: string;
  group: RotationGroup;
  seasons: [number, number];
  minYears: Range | null;
  message: string;
}

export interface BedRotation {
  objectId: string;
  entries: RotationEntry[];
  issues: RotationIssue[];
  suggestion: { season: number; group: RotationGroup; reason: string } | null;
}

export function collectRotationEntries(doc: ProjectDoc, lookup: PlantLookup): Map<string, RotationEntry[]> {
  const byObject = new Map<string, Map<string, RotationEntry>>();
  const add = (objectId: string, season: number, group: RotationGroup, crop: string, source: RotationEntry['source']) => {
    const m = byObject.get(objectId) ?? new Map<string, RotationEntry>();
    const key = `${season}:${group}`;
    const e = m.get(key) ?? { season, group, crops: [], source };
    if (crop && !e.crops.includes(crop)) e.crops.push(crop);
    m.set(key, e);
    byObject.set(objectId, m);
  };
  for (const p of Object.values(doc.plantings)) {
    const plant = lookup(p.plantId);
    const group = plant?.rotation?.group;
    if (!group || group === 'perennial') continue;
    add(p.objectId, p.season, group, plant ? plantDisplayName(plant) : p.plantId, 'planting');
  }
  for (const r of doc.rotationHistory) add(r.objectId, r.season, r.group, r.crop, 'history');
  const out = new Map<string, RotationEntry[]>();
  for (const [id, m] of byObject) out.set(id, [...m.values()].sort((a, b) => a.season - b.season));
  return out;
}

export function analyzeRotation(doc: ProjectDoc, lookup: PlantLookup, rules: RotationRule[]): BedRotation[] {
  const entries = collectRotationEntries(doc, lookup);
  const ruleOf = new Map(rules.map((r) => [r.group, r]));
  const result: BedRotation[] = [];
  for (const obj of Object.values(doc.objects)) {
    if (!kindInfo(obj.kind).plantable || obj.kind === 'tree' || obj.kind === 'shrub') continue;
    const list = entries.get(obj.id) ?? [];
    const issues: RotationIssue[] = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.group !== b.group || a.group === 'other') continue;
        const rule = ruleOf.get(a.group);
        const gap = b.season - a.season;
        const minYears = rule?.minYearsBetween ?? null;
        if (minYears && gap > 0 && gap < minYears.min) {
          issues.push({
            objectId: obj.id,
            group: a.group,
            seasons: [a.season, b.season],
            minYears,
            message: `${rule?.label.en ?? a.group} grown in ${a.season} and again in ${b.season}; guidance suggests leaving ${minYears.min === minYears.max ? minYears.min : `${minYears.min}–${minYears.max}`} years between. ${rule?.reason.en ?? ''}`.trim(),
          });
        }
      }
    }
    let suggestion: BedRotation['suggestion'] = null;
    const last = list.length ? list[list.length - 1] : null;
    if (last) {
      const course = ROTATION_SEQUENCE.includes(last.group) ? last.group : COURSE_OF[last.group];
      if (course) {
        const idx = ROTATION_SEQUENCE.indexOf(course);
        const next = ROTATION_SEQUENCE[(idx + 1) % ROTATION_SEQUENCE.length];
        suggestion = {
          season: last.season + 1,
          group: next,
          reason: `In a conventional four-course rotation (potatoes → legumes → brassicas → roots), ${ruleOf.get(course)?.label.en ?? course} are followed by ${ruleOf.get(next)?.label.en ?? next}.`,
        };
      }
    }
    if (list.length || issues.length) result.push({ objectId: obj.id, entries: list, issues, suggestion });
  }
  return result;
}
