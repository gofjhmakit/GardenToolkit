/**
 * PlantCatalog — the in-memory, indexed view of the global plant database.
 *
 * Sources, in priority order (later wins on id collision):
 *   1. bundled/reference datasets (public/data/plants/*.json, cached offline
 *      by the service worker);
 *   2. user-defined plants stored in IndexedDB ("My plants").
 * Project-embedded plants are resolved separately (see makeLookup) and never
 * merged into the catalog.
 *
 * Each record is validated individually so one malformed record does not
 * invalidate a whole dataset.
 */
import MiniSearch from 'minisearch';
import {
  PlantDatasetSchema,
  PlantSchema,
  type CompanionRelation,
  type DataSource,
  type Plant,
  type RotationRule,
} from './schema';
import { allCommonNames } from './names';

export interface DatasetInfo {
  id: string;
  title: string;
  version: string;
  license: string;
  origin: 'bundled' | 'user';
  plantCount: number;
  rejected: number;
  description?: string;
}

export interface LoadIssue {
  dataset: string;
  plantId?: string;
  message: string;
}

export class PlantCatalog {
  readonly plants = new Map<string, Plant>();
  readonly datasets: DatasetInfo[] = [];
  readonly sources = new Map<string, DataSource>();
  companions: CompanionRelation[] = [];
  rotationRules: RotationRule[] = [];
  readonly issues: LoadIssue[] = [];
  private index: MiniSearch<{ id: string }> | null = null;

  /** Adds a parsed dataset file (unknown JSON). Returns false if the file itself is invalid. */
  addDataset(json: unknown, origin: DatasetInfo['origin'] = 'bundled'): boolean {
    const parsed = PlantDatasetSchema.safeParse(json);
    if (!parsed.success) {
      this.issues.push({ dataset: 'unknown', message: `Invalid dataset file: ${parsed.error.issues[0]?.message ?? 'unknown error'}` });
      return false;
    }
    const ds = parsed.data;
    let accepted = 0;
    let rejected = 0;
    for (const raw of ds.plants) {
      const p = PlantSchema.safeParse(raw);
      if (p.success) {
        this.plants.set(p.data.id, p.data);
        accepted++;
      } else {
        rejected++;
        const id = typeof raw === 'object' && raw && 'id' in raw ? String((raw as { id: unknown }).id) : undefined;
        this.issues.push({ dataset: ds.dataset.id, plantId: id, message: p.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
      }
    }
    for (const s of ds.sources) this.sources.set(s.id, s);
    this.companions.push(...ds.companions);
    // Rotation rules: later datasets override earlier ones per group.
    const byGroup = new Map(this.rotationRules.map((r) => [r.group, r]));
    for (const r of ds.rotation) byGroup.set(r.group, r);
    this.rotationRules = [...byGroup.values()];
    this.datasets.push({
      id: ds.dataset.id,
      title: ds.dataset.title,
      version: ds.dataset.version,
      license: ds.dataset.license,
      description: ds.dataset.description,
      origin,
      plantCount: accepted,
      rejected,
    });
    this.index = null;
    return true;
  }

  /** Adds user-defined plants (validated). */
  addUserPlants(plants: unknown[]): void {
    let accepted = 0;
    let rejected = 0;
    for (const raw of plants) {
      const p = PlantSchema.safeParse(raw);
      if (p.success) {
        this.plants.set(p.data.id, p.data);
        accepted++;
      } else rejected++;
    }
    const existing = this.datasets.find((d) => d.id === 'user');
    if (existing) {
      existing.plantCount += accepted;
      existing.rejected += rejected;
    } else {
      this.datasets.push({ id: 'user', title: 'My plants', version: 'local', license: 'User data', origin: 'user', plantCount: accepted, rejected });
    }
    this.index = null;
  }

  upsertUserPlant(plant: Plant): void {
    this.plants.set(plant.id, plant);
    this.index = null;
  }

  removePlant(id: string): void {
    this.plants.delete(id);
    this.index = null;
  }

  get(id: string): Plant | undefined {
    return this.plants.get(id);
  }

  all(): Plant[] {
    return [...this.plants.values()];
  }

  private ensureIndex(): MiniSearch<{ id: string }> {
    if (this.index) return this.index;
    const ms = new MiniSearch<{ id: string }>({
      fields: ['common', 'scientific', 'synonyms', 'taxonomy', 'tags', 'category'],
      storeFields: ['id'],
      searchOptions: {
        boost: { common: 3, scientific: 2, synonyms: 1.5 },
        prefix: true,
        fuzzy: (term) => (term.length > 3 ? 0.2 : false),
        combineWith: 'AND',
      },
      // Accent-insensitive matching so "paarynapuu" finds "Päärynäpuu".
      processTerm: (term) =>
        term
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, ''),
    });
    ms.addAll(
      this.all().map((p) => ({
        id: p.id,
        common: allCommonNames(p).join(' '),
        scientific: p.names.scientific,
        synonyms: p.names.synonyms.join(' '),
        taxonomy: [p.taxonomy.family, p.taxonomy.genus].filter(Boolean).join(' '),
        tags: p.tags.join(' '),
        category: p.category,
      })),
    );
    this.index = ms;
    return ms;
  }

  /** Full-text search. Returns ids ordered by relevance. */
  searchIds(query: string): string[] {
    const q = query.trim();
    if (!q) return [];
    const ms = this.ensureIndex();
    let res = ms.search(q);
    if (res.length === 0) res = ms.search(q, { combineWith: 'OR' });
    return res.map((r) => r.id as string);
  }

  /** Builds the index eagerly (e.g. during idle time). */
  warmIndex(): void {
    this.ensureIndex();
  }
}

export async function fetchDataset(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: HTTP ${res.status}`);
  return res.json();
}

/** Bundled datasets. Additional generated datasets can be listed here. */
export const BUNDLED_DATASETS = ['data/plants/core.json'];
