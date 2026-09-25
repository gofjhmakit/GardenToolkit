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
  loadProject,
  putAsset,
  saveProject,
  storeImportedProject,
} from '../persistence/projectRepo';
import { buildProjectJson, buildProjectPackage, importProjectFile } from '../persistence/projectPackage';
import { requestPersistentStorage } from '../persistence/db';
import { flushSave, markLoaded, resetAutosave } from './autosave';
import { useAssetUrls } from './assets';
import { usePlants } from './plantStore';
import { makeLookup } from './lookup';
import { prepareBlueprint } from './images';
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
  void requestPersistentStorage();
  requestAnimationFrame(() => editorApi.getState().fitToContent());
  return { ok: true };
}

export async function createNewProject(name: string, location: Partial<LocationSettings>): Promise<string> {
  const doc = createProject(name, { location });
  await saveProject(doc);
  return doc.id;
}

export async function closeProject(): Promise<void> {
  await flushSave();
  editorApi.getState().close();
  useAssetUrls.getState().clear();
}

export async function importProjectFromFile(file: File): Promise<string | null> {
  const catalog = usePlants.getState().catalog;
  const res = await importProjectFile(file, (id) => catalog.plants.has(id));
  if (!res.ok) {
    toast('error', `Import failed: ${res.error}`, res.details);
    return null;
  }
  await storeImportedProject(res.doc, res.assets);
  if (res.warnings.length) toast('info', `Imported "${res.doc.meta.name}" with warnings`, res.warnings);
  else toast('ok', `Imported "${res.doc.meta.name}"`);
  return res.doc.id;
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
