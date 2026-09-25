/**
 * Application-level project operations used by the UI: open/create/import/
 * export, blueprint import. Keeps orchestration out of React components.
 */
import { newId } from '../lib/ids';
import { downloadBlob, safeFileName } from '../lib/download';
import { createProject } from '../domain/projectFactory';
import type { LocationSettings, ProjectDoc } from '../domain/project';
import { editorApi, screenToWorld } from '../editor/store';
import { addBackground } from '../editor/commands';
import {
  assetsForProject,
  duplicateProject,
  getSnapshot,
  listProjects,
  loadProject,
  pruneAssets,
  putAsset,
  saveProject,
  storeImportedProject,
} from '../persistence/projectRepo';
import { buildBackupArchive, buildProjectJson, buildProjectPackage, importAnyFile } from '../persistence/projectPackage';
import { requestPersistentStorage } from '../persistence/db';
import { flushSave, markLoaded, resetAutosave } from './autosave';
import { useAssetUrls } from './assets';
import { usePlants } from './plantStore';
import { makeLookup } from './lookup';
import { prepareBlueprint } from './images';
import { announceClosed, announceOpen, useTabGuard } from './tabGuard';
import { toast } from '../ui/components/feedback';

export function navigate(hash: string): void {
  if (location.hash !== hash) location.hash = hash;
}

export async function openProjectById(id: string): Promise<{ ok: true } | { ok: false; error: string; details: string[] }> {
  const res = await loadProject(id);
  if (!res) return { ok: false, error: 'Project not found in this browser.', details: [] };
  if (!res.ok) return { ok: false, error: res.error, details: res.details };
  useAssetUrls.getState().clear();
  markLoaded(res.doc);
  editorApi.getState().open(res.doc);
  if (res.migratedFrom != null) {
    toast('info', `Project upgraded from format ${res.migratedFrom} to the current version.`);
    await saveProject(res.doc);
  }
  await resetAutosave(res.doc);
  announceOpen(res.doc.id);
  void requestPersistentStorage();
  requestAnimationFrame(() => editorApi.getState().fitToContent());
  return { ok: true };
}

export async function createNewProject(name: string, location: Partial<LocationSettings>): Promise<string> {
  const doc = createProject(name, { location });
  await saveProject(doc);
  return doc.id;
}

/** Images younger than this are never pruned (another tab may not have saved yet). */
const PRUNE_MIN_AGE_MS = 10 * 60 * 1000;

export async function closeProject(): Promise<void> {
  await flushSave();
  const closing = editorApi.getState().doc;
  // With the project open elsewhere, that tab's undo history may still need the images.
  const sharedWithOtherTab = useTabGuard.getState().otherTabs;
  announceClosed();
  editorApi.getState().close();
  useAssetUrls.getState().clear();
  // The undo history is gone now, so images no saved state references can be freed.
  if (closing && !sharedWithOtherTab) {
    void pruneAssets(closing.id, { minAgeMs: PRUNE_MIN_AGE_MS }).catch(() => {
      /* best effort: leftover images only cost space */
    });
  }
}

/** File types accepted by project import (packages, JSON and multi-project backups). */
export const PROJECT_FILE_ACCEPT = '.gtkproject,.gtkbackup,.zip,.json,application/json,application/zip';

/**
 * Imports one or more files (single projects or multi-project backups).
 * Returns the ids of the imported projects; problems are reported as toasts.
 */
export async function importProjectFiles(files: File[]): Promise<string[]> {
  const catalog = usePlants.getState().catalog;
  const ids: string[] = [];
  const failures: string[] = [];
  const warnings: string[] = [];
  for (const file of files) {
    const results = await importAnyFile(file, file.name, (id) => catalog.plants.has(id));
    for (const { source, result } of results) {
      if (!result.ok) {
        failures.push(`${source}: ${result.error}${result.details.length ? ` (${result.details[0]})` : ''}`);
        continue;
      }
      await storeImportedProject(result.doc, result.assets);
      ids.push(result.doc.id);
      warnings.push(...result.warnings.map((w) => `${result.doc.meta.name}: ${w}`));
    }
  }
  if (ids.length) {
    toast(warnings.length ? 'info' : 'ok', ids.length === 1 ? `Imported 1 project${warnings.length ? ' with warnings' : ''}` : `Imported ${ids.length} projects${warnings.length ? ' with warnings' : ''}`, warnings);
  }
  if (failures.length) toast('error', failures.length === 1 && !ids.length ? 'Import failed' : `${failures.length} file(s) could not be imported`, failures);
  return ids;
}

/** Imports a single file; kept for callers that expect one project. */
export async function importProjectFromFile(file: File): Promise<string | null> {
  const ids = await importProjectFiles([file]);
  return ids[0] ?? null;
}

/** Exports a stored project without opening it (used by the project list). */
export async function exportStoredProject(id: string, format: 'package' | 'json'): Promise<boolean> {
  if (editorApi.getState().doc?.id === id) await flushSave();
  const res = await loadProject(id);
  if (!res?.ok) {
    toast('error', 'This project could not be read for export.');
    return false;
  }
  if (format === 'package') await exportProjectPackage(res.doc);
  else await exportProjectJson(res.doc, true);
  return true;
}

/** Exports every project in this browser into one backup file. */
export async function exportAllProjects(): Promise<number> {
  await flushSave();
  const metas = await listProjects();
  const entries = [];
  const skipped: string[] = [];
  for (const m of metas) {
    const res = await loadProject(m.id);
    if (res?.ok) entries.push({ doc: res.doc, assets: await assetsForProject(m.id) });
    else skipped.push(m.name);
  }
  if (!entries.length) {
    toast('info', 'There are no projects to export yet.');
    return 0;
  }
  const catalog = usePlants.getState().catalog;
  const blob = await buildBackupArchive(entries, (id) => catalog.get(id));
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `garden-toolkit-backup-${stamp}.gtkbackup`);
  if (skipped.length) toast('error', `${skipped.length} unreadable project(s) were not included`, skipped);
  else toast('ok', `Exported ${entries.length} project${entries.length === 1 ? '' : 's'} to one backup file`);
  return entries.length;
}

function currentLookup(doc: ProjectDoc) {
  return makeLookup(usePlants.getState().catalog, doc);
}

export async function exportProjectPackage(doc: ProjectDoc): Promise<void> {
  await flushSave();
  const assets = await assetsForProject(doc.id);
  const blob = await buildProjectPackage(doc, assets, currentLookup(doc));
  downloadBlob(blob, `${safeFileName(doc.meta.name)}.gtkproject`);
}

export async function exportProjectJson(doc: ProjectDoc, embedImages: boolean): Promise<void> {
  const assets = await assetsForProject(doc.id);
  const blob = await buildProjectJson(doc, assets, currentLookup(doc), embedImages);
  downloadBlob(blob, `${safeFileName(doc.meta.name)}.gardentoolkit.json`);
}

export async function saveProjectAs(doc: ProjectDoc, name: string): Promise<string> {
  await flushSave();
  const copy = await duplicateProject(doc, name);
  return copy.id;
}

export async function restoreSnapshot(snapshotId: string): Promise<boolean> {
  const snap = await getSnapshot(snapshotId);
  const editor = editorApi.getState();
  if (!snap || !editor.doc) return false;
  const restored = { ...snap.doc, id: editor.doc.id };
  editor.commit(`Restore version from ${new Date(snap.createdAt).toLocaleString()}`, (d) => {
    Object.assign(d, restored);
  });
  return true;
}

/** Imports an image/PDF as a blueprint background, centred in the current view. */
export async function importBlueprint(file: File): Promise<void> {
  const editor = editorApi.getState();
  const doc = editor.doc;
  if (!doc) return;
  let prepared;
  try {
    prepared = await prepareBlueprint(file);
  } catch (e) {
    toast('error', 'Could not import the image', [e instanceof Error ? e.message : String(e)]);
    return;
  }
  const assetId = newId('ast');
  await putAsset({
    id: assetId,
    projectId: doc.id,
    name: prepared.name,
    mimeType: prepared.mimeType,
    byteSize: prepared.blob.size,
    width: prepared.width,
    height: prepared.height,
    blob: prepared.blob,
    createdAt: new Date().toISOString(),
  });
  useAssetUrls.getState().register(assetId, prepared.blob);
  // Until calibrated, assume the image spans 20 m — shown as "uncalibrated" in the UI.
  const mmPerPx = 20000 / prepared.width;
  const { view, viewport } = editorApi.getState();
  const center = screenToWorld(view, { x: viewport.width / 2, y: viewport.height / 2 });
  const bgId = newId('bg');
  editor.commit('Import blueprint', (d) =>
    addBackground(d, {
      id: bgId,
      assetId,
      name: prepared.name,
      transform: { x: center.x, y: center.y, rotation: 0 },
      mmPerPx,
      naturalWidth: prepared.width,
      naturalHeight: prepared.height,
      crop: null,
      opacity: 0.85,
      visible: true,
      locked: false,
      calibration: null,
    }),
  );
  editorApi.getState().selectBackground(bgId);
  requestAnimationFrame(() => editorApi.getState().fitToContent());
  toast('ok', 'Blueprint imported', [
    ...(prepared.note ? [prepared.note] : []),
    'Next: calibrate the scale (Calibrate tool) by clicking two points with a known distance.',
  ]);
}
