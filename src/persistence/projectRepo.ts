/**
 * Project repository: all IndexedDB access for projects, assets and
 * snapshots goes through here. UI code never touches Dexie directly.
 */
import { newId } from '../lib/ids';
import type { ProjectDoc } from '../domain/project';
import { getDb, type AssetRecord, type ProjectMeta, type SnapshotRecord } from './db';
import { parseStoredDoc, type ParseDocResult } from './migrations';

export const MAX_AUTO_SNAPSHOTS = 20;

function metaFor(doc: ProjectDoc): ProjectMeta {
  return {
    id: doc.id,
    name: doc.meta.name,
    description: doc.meta.description,
    createdAt: doc.meta.createdAt,
    updatedAt: doc.meta.updatedAt,
    docVersion: doc.docVersion,
    objectCount: Object.keys(doc.objects).length,
    plantingCount: Object.keys(doc.plantings).length,
  };
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const db = getDb();
  const all = await db.projects.toArray();
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveProject(doc: ProjectDoc): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.projects, db.docs, async () => {
    await db.docs.put({ id: doc.id, doc });
    await db.projects.put(metaFor(doc));
  });
}

export async function loadProject(id: string): Promise<ParseDocResult | null> {
  const db = getDb();
  const rec = await db.docs.get(id);
  if (!rec) return null;
  return parseStoredDoc(rec.doc);
}

export async function projectExists(id: string): Promise<boolean> {
  return (await getDb().projects.get(id)) != null;
}

export async function renameProject(id: string, name: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', db.projects, db.docs, async () => {
    const rec = await db.docs.get(id);
    if (!rec) return;
    const now = new Date().toISOString();
    const doc = { ...rec.doc, meta: { ...rec.doc.meta, name, updatedAt: now } };
    await db.docs.put({ id, doc });
    await db.projects.put(metaFor(doc));
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = getDb();
  await db.transaction('rw', [db.projects, db.docs, db.assets, db.snapshots], async () => {
    await db.projects.delete(id);
    await db.docs.delete(id);
    await db.assets.where('projectId').equals(id).delete();
    await db.snapshots.where('projectId').equals(id).delete();
  });
}

/** Copies a project including its images. Used by "Duplicate" and "Save as". */
export async function duplicateProject(sourceDoc: ProjectDoc, newName: string): Promise<ProjectDoc> {
  const db = getDb();
  const now = new Date().toISOString();
  const newIdValue = newId('prj');
  const assets = await db.assets.where('projectId').equals(sourceDoc.id).toArray();
  const idMap = new Map<string, string>();
  const copies: AssetRecord[] = assets.map((a) => {
    const id = newId('ast');
    idMap.set(a.id, id);
    return { ...a, id, projectId: newIdValue, createdAt: now };
  });
  const doc: ProjectDoc = {
    ...sourceDoc,
    id: newIdValue,
    meta: { ...sourceDoc.meta, name: newName, createdAt: now, updatedAt: now },
    backgrounds: sourceDoc.backgrounds.map((b) => ({ ...b, assetId: idMap.get(b.assetId) ?? b.assetId })),
  };
  await db.transaction('rw', [db.projects, db.docs, db.assets], async () => {
    await db.assets.bulkPut(copies);
    await db.docs.put({ id: doc.id, doc });
    await db.projects.put(metaFor(doc));
  });
  return doc;
}

/** Stores a newly imported project with its assets atomically. */
export async function storeImportedProject(
  doc: ProjectDoc,
  assets: Omit<AssetRecord, 'projectId' | 'createdAt'>[],
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db.transaction('rw', [db.projects, db.docs, db.assets], async () => {
    await db.assets.bulkPut(assets.map((a) => ({ ...a, projectId: doc.id, createdAt: now })));
    await db.docs.put({ id: doc.id, doc });
    await db.projects.put(metaFor(doc));
  });
}

// --- Assets ---------------------------------------------------------------

export async function putAsset(asset: AssetRecord): Promise<void> {
  await getDb().assets.put(asset);
}

export async function getAsset(id: string): Promise<AssetRecord | undefined> {
  return getDb().assets.get(id);
}

export async function assetsForProject(projectId: string): Promise<AssetRecord[]> {
  return getDb().assets.where('projectId').equals(projectId).toArray();
}

/** Removes assets that no longer have a referencing background. */
export async function pruneAssets(doc: ProjectDoc): Promise<number> {
  const used = new Set(doc.backgrounds.map((b) => b.assetId));
  // Snapshots may still reference older images; keep those too.
  const snaps = await getDb().snapshots.where('projectId').equals(doc.id).toArray();
  for (const s of snaps) for (const b of s.doc.backgrounds) used.add(b.assetId);
  const assets = await assetsForProject(doc.id);
  const stale = assets.filter((a) => !used.has(a.id)).map((a) => a.id);
  if (stale.length) await getDb().assets.bulkDelete(stale);
  return stale.length;
}

// --- Snapshots ------------------------------------------------------------

export async function createSnapshot(doc: ProjectDoc, label: string, auto: boolean): Promise<SnapshotRecord> {
  const db = getDb();
  const snap: SnapshotRecord = { id: newId('snap'), projectId: doc.id, createdAt: new Date().toISOString(), label, auto, doc };
  await db.snapshots.put(snap);
  if (auto) {
    const autos = (await db.snapshots.where('projectId').equals(doc.id).toArray())
      .filter((s) => s.auto)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const excess = autos.slice(MAX_AUTO_SNAPSHOTS).map((s) => s.id);
    if (excess.length) await db.snapshots.bulkDelete(excess);
  }
  return snap;
}

export async function listSnapshots(projectId: string): Promise<Omit<SnapshotRecord, 'doc'>[]> {
  const snaps = await getDb().snapshots.where('projectId').equals(projectId).toArray();
  return snaps
    .map(({ doc: _doc, ...rest }) => rest)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSnapshot(id: string): Promise<SnapshotRecord | undefined> {
  return getDb().snapshots.get(id);
}

export async function deleteSnapshot(id: string): Promise<void> {
  await getDb().snapshots.delete(id);
}

// --- Key/value -------------------------------------------------------------

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const rec = await getDb().kv.get(key);
    return rec ? (rec.value as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await getDb().kv.put({ key, value });
}
