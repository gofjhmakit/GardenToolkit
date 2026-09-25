/**
 * Internal document migrations. Each step upgrades a raw object from
 * version N to N+1 and must be pure. After migrating, the result is
 * validated with ProjectDocSchema.
 */
import { DOC_VERSION, ProjectDocSchema, type ProjectDoc } from '../domain/project';

type RawDoc = Record<string, unknown>;
type Migration = (doc: RawDoc) => RawDoc;

/**
 * migrations[n] upgrades a document at version n to version n + 1.
 * Version 0 represents pre-release documents without `docVersion`.
 */
export const DOC_MIGRATIONS: Record<number, Migration> = {
  0: (doc) => ({ ...doc, docVersion: 1 }),
};

export class MigrationError extends Error {}

export function migrateRawDoc(raw: unknown, target = DOC_VERSION, migrations = DOC_MIGRATIONS): { doc: RawDoc; from: number } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new MigrationError('Project data is not an object.');
  let doc = raw as RawDoc;
  const from = typeof doc.docVersion === 'number' ? doc.docVersion : 0;
  if (from > target) {
    throw new MigrationError(
      `This project was saved by a newer version of Garden Toolkit (format ${from}; this app supports up to ${target}). Update the app to open it.`,
    );
  }
  for (let v = from; v < target; v++) {
    const step = migrations[v];
    if (!step) throw new MigrationError(`No migration path from project format ${v} to ${v + 1}.`);
    doc = step(doc);
  }
  return { doc, from };
}

export type ParseDocResult =
  | { ok: true; doc: ProjectDoc; migratedFrom: number | null }
  | { ok: false; error: string; details: string[] };

/** Migrates and validates a stored document. Never throws. */
export function parseStoredDoc(raw: unknown): ParseDocResult {
  try {
    const { doc, from } = migrateRawDoc(raw);
    const res = ProjectDocSchema.safeParse(doc);
    if (!res.success) {
      return {
        ok: false,
        error: 'The project data failed validation.',
        details: res.error.issues.slice(0, 20).map((i) => `${i.path.join('.')}: ${i.message}`),
      };
    }
    return { ok: true, doc: repairReferences(res.data), migratedFrom: from === DOC_VERSION ? null : from };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), details: [] };
  }
}

/**
 * Repairs referential integrity problems that schema validation cannot see
 * (dangling ids, objects missing from layers). Defensive: a partially broken
 * project should open with its data intact rather than refuse to load.
 */
export function repairReferences(doc: ProjectDoc): ProjectDoc {
  // Own-property checks only: ids such as "constructor" or "toString" must not
  // resolve to Object.prototype members and pass as existing records.
  const hasObject = (id: string) => Object.hasOwn(doc.objects, id);
  const layers = doc.layers.length
    ? doc.layers
    : [{ id: 'layer-beds', name: 'Garden', role: 'content' as const, visible: true, locked: false, objectIds: [] }];
  const layerIds = new Set(layers.map((l) => l.id));
  const fallbackLayer = layers.find((l) => l.role === 'content') ?? layers[0];
  const seen = new Set<string>();
  const newLayers = layers.map((l) => ({
    ...l,
    objectIds: l.objectIds.filter((id) => {
      if (!hasObject(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  }));
  const objects = { ...doc.objects };
  for (const [id, obj] of Object.entries(objects)) {
    let o = obj;
    if (!layerIds.has(o.layerId)) o = { ...o, layerId: fallbackLayer.id };
    if (o.groupId && !Object.hasOwn(doc.groups, o.groupId)) o = { ...o, groupId: null };
    objects[id] = o;
    if (!seen.has(id)) {
      const target = newLayers.find((l) => l.id === o.layerId) ?? newLayers[0];
      target.objectIds.push(id);
      seen.add(id);
    }
  }
  const plantings = Object.fromEntries(Object.entries(doc.plantings).filter(([, p]) => hasObject(p.objectId)));
  const customTasks = doc.customTasks.map((t) => (t.objectId && !hasObject(t.objectId) ? { ...t, objectId: null } : t));
  return { ...doc, layers: newLayers, objects, plantings, customTasks };
}
