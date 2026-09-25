/**
 * Companion planting lookups. Each relation carries an evidence level so the
 * UI can distinguish documented effects from common claims and folklore.
 */
import type { CompanionRelation, Plant } from '../plants/schema';

/**
 * Relation endpoints may be a plant id, `genus:<Genus>` or `family:<Family>`.
 */
export function matchesEndpoint(endpoint: string, plant: Plant): boolean {
  if (endpoint.startsWith('genus:')) return plant.taxonomy.genus?.toLowerCase() === endpoint.slice(6).toLowerCase();
  if (endpoint.startsWith('family:')) return plant.taxonomy.family?.toLowerCase() === endpoint.slice(7).toLowerCase();
  return plant.id === endpoint;
}

export interface CompanionFinding {
  relation: CompanionRelation;
  a: Plant;
  b: Plant;
}

/** Relations that apply between any two of the given plants. */
export function findCompanionRelations(plants: Plant[], relations: CompanionRelation[]): CompanionFinding[] {
  const out: CompanionFinding[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < plants.length; i++) {
    for (let j = i + 1; j < plants.length; j++) {
      const p = plants[i];
      const q = plants[j];
      if (p.id === q.id) continue;
      for (const r of relations) {
        const forward = matchesEndpoint(r.a, p) && matchesEndpoint(r.b, q);
        const backward = matchesEndpoint(r.a, q) && matchesEndpoint(r.b, p);
        if (!forward && !backward) continue;
        const key = `${[p.id, q.id].sort().join('|')}|${r.a}|${r.b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ relation: r, a: forward ? p : q, b: forward ? q : p });
      }
    }
  }
  return out;
}

/** All relations that mention a single plant (for the plant detail view). */
export function relationsForPlant(plant: Plant, relations: CompanionRelation[]): CompanionRelation[] {
  return relations.filter((r) => matchesEndpoint(r.a, plant) || matchesEndpoint(r.b, plant));
}

export const EVIDENCE_LABEL: Record<CompanionRelation['evidence'], string> = {
  documented: 'Documented',
  'common-claim': 'Common claim',
  traditional: 'Traditional / folklore',
};
