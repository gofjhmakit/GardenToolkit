/**
 * IndexedDB schema (via Dexie).
 *
 * Why IndexedDB: projects, images and snapshots can be many megabytes;
 * IndexedDB stores structured objects and Blobs natively (no JSON/base64
 * blow-up), is asynchronous, and is available in all modern browsers.
 * localStorage is used only for tiny UI preferences (see prefs.ts).
 *
 * Tables
 *  - projects:  lightweight metadata for the project list
 *  - docs:      the full project document (one row per project)
 *  - assets:    binary assets (blueprint images) as Blobs
 *  - snapshots: version snapshots of project documents
 *  - userPlants: user-defined plant records ("My plants")
 *  - kv:        small key/value state (favourites, recent plants)
 */
import Dexie, { type EntityTable } from 'dexie';
import type { ProjectDoc } from '../domain/project';
import type { Plant } from '../plants/schema';

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  docVersion: number;
  objectCount: number;
  plantingCount: number;
  thumbnail?: string | null;
}

export interface DocRecord {
  id: string;
  doc: ProjectDoc;
}

export interface AssetRecord {
  id: string;
  projectId: string;
  name: string;
  mimeType: string;
  byteSize: number;
  width: number;
  height: number;
  blob: Blob;
  createdAt: string;
}

export interface SnapshotRecord {
  id: string;
  projectId: string;
  createdAt: string;
  label: string;
  auto: boolean;
  doc: ProjectDoc;
}

export interface KvRecord {
  key: string;
  value: unknown;
}

export type GardenDB = Dexie & {
  projects: EntityTable<ProjectMeta, 'id'>;
  docs: EntityTable<DocRecord, 'id'>;
  assets: EntityTable<AssetRecord, 'id'>;
  snapshots: EntityTable<SnapshotRecord, 'id'>;
  userPlants: EntityTable<Plant, 'id'>;
  kv: EntityTable<KvRecord, 'key'>;
};

export function openDatabase(name = 'garden-toolkit'): GardenDB {
  const db = new Dexie(name) as GardenDB;
  db.version(1).stores({
    projects: 'id, updatedAt, name',
    docs: 'id',
    assets: 'id, projectId',
    snapshots: 'id, projectId, createdAt, [projectId+createdAt]',
    userPlants: 'id',
    kv: 'key',
  });
  return db;
}

let instance: GardenDB | null = null;

export function getDb(): GardenDB {
  if (!instance) instance = openDatabase();
  return instance;
}

/** For tests: replace the singleton. */
export function setDb(db: GardenDB | null): void {
  instance = db;
}

/**
 * Asks the browser not to evict our storage under pressure. Browsers may
 * grant this silently (installed PWA, bookmarked site) or refuse; either
 * way the app keeps working.
 */
export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* not supported */
  }
  return null;
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    if (e && e.usage != null && e.quota != null) return { usage: e.usage, quota: e.quota };
  } catch {
    /* ignore */
  }
  return null;
}
