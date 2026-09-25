/**
 * Autosave: persists the document to IndexedDB shortly after every change,
 * without blocking the UI, and flushes when the tab is hidden. Also takes
 * periodic automatic version snapshots.
 */
import type { ProjectDoc } from '../domain/project';
import { useEditor } from '../editor/store';
import { createSnapshot, listSnapshots, saveProject } from '../persistence/projectRepo';

const DEBOUNCE_MS = 700;
const AUTO_SNAPSHOT_MS = 15 * 60 * 1000;

let timer: ReturnType<typeof setTimeout> | null = null;
let lastSaved: ProjectDoc | null = null;
let saving: Promise<void> | null = null;
let lastSnapshotAt = 0;
let started = false;

async function doSave(): Promise<void> {
  const { doc, gesture } = useEditor.getState();
  if (!doc) return;
  if (doc === lastSaved) {
    if (useEditor.getState().saveStatus !== 'saved') useEditor.getState().setSaveStatus('saved');
    return;
  }
  if (gesture) {
    schedule();
    return;
  }
  useEditor.getState().setSaveStatus('saving');
  try {
    await saveProject(doc);
    lastSaved = doc;
    if (useEditor.getState().doc === doc) useEditor.getState().setSaveStatus('saved');
    if (Date.now() - lastSnapshotAt > AUTO_SNAPSHOT_MS) {
      lastSnapshotAt = Date.now();
      await createSnapshot(doc, 'Automatic snapshot', true);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    useEditor.getState().setSaveStatus('error', /quota/i.test(msg) ? 'Browser storage is full. Export a backup and free space.' : msg);
  }
}

function schedule(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    saving = (saving ?? Promise.resolve()).then(doSave);
  }, DEBOUNCE_MS);
}

/** Saves immediately (e.g. Ctrl+S, before navigation). */
export async function flushSave(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  saving = (saving ?? Promise.resolve()).then(doSave);
  await saving;
}

/** Marks a freshly loaded document as already persisted (call before opening it). */
export function markLoaded(doc: ProjectDoc): void {
  lastSaved = doc;
}

/** Called when a project is opened. */
export async function resetAutosave(doc: ProjectDoc): Promise<void> {
  lastSaved = doc;
  lastSnapshotAt = 0;
  try {
    const snaps = await listSnapshots(doc.id);
    const lastAuto = snaps.find((s) => s.auto);
    lastSnapshotAt = lastAuto ? Date.parse(lastAuto.createdAt) : 0;
    // Snapshot on open so there is always a restore point for this session.
    if (Date.now() - lastSnapshotAt > AUTO_SNAPSHOT_MS) {
      lastSnapshotAt = Date.now();
      await createSnapshot(doc, 'Opened project', true);
    }
  } catch {
    /* snapshots are best-effort */
  }
}

export function startAutosave(): void {
  if (started) return;
  started = true;
  useEditor.subscribe((state, prev) => {
    if (state.doc && state.doc !== prev.doc && state.doc !== lastSaved && !state.gesture) {
      if (state.saveStatus !== 'pending' && state.saveStatus !== 'saving') useEditor.getState().setSaveStatus('pending');
      schedule();
    }
    if (prev.gesture && !state.gesture) schedule();
  });
  const flush = () => {
    if (document.visibilityState === 'hidden') void flushSave();
  };
  document.addEventListener('visibilitychange', flush);
  window.addEventListener('pagehide', () => void flushSave());
  window.addEventListener('beforeunload', (e) => {
    const s = useEditor.getState();
    if (s.doc && (s.saveStatus === 'pending' || s.saveStatus === 'saving')) {
      void flushSave();
      e.preventDefault();
    }
  });
}
