/**
 * Editor state (zustand) with snapshot-based undo/redo.
 *
 * Undo model: the document is immutable (immer). Each history entry keeps a
 * reference to the previous document; thanks to structural sharing this is
 * cheap even for large projects. Continuous gestures (dragging, resizing)
 * update the document live and produce a single history entry at the end.
 */
import { create } from 'zustand';
import { produce, setAutoFreeze } from 'immer';
import type { ProjectDoc, ObjectKind } from '../domain/project';
import type { Bounds, Vec } from '../domain/geometry';
import type { ClipboardPayload } from './commands';
import { contentBounds, expandToGroups, selectionBounds } from './commands';

// Freezing is useful in development but costs time on large documents.
setAutoFreeze(import.meta.env?.DEV ?? false);

export type ToolId =
  | 'select'
  | 'hand'
  | 'rect'
  | 'ellipse'
  | 'polygon'
  | 'freehand'
  | 'polyline'
  | 'text'
  | 'dimension'
  | 'measure'
  | 'tree'
  | 'shrub'
  | 'calibrate';

export type Workspace = 'design' | 'plantings' | 'calendar' | 'harvest' | 'care' | 'rotation' | 'plants' | 'reports' | 'settings';

/** screen = world × scale + (x, y). scale is screen pixels per millimetre. */
export interface View {
  scale: number;
  x: number;
  y: number;
}

export interface HistoryEntry {
  doc: ProjectDoc;
  selection: string[];
  label: string;
  time: number;
  coalesceKey?: string;
}

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error';

export const MIN_SCALE = 0.002; // 1 px = 500 mm
export const MAX_SCALE = 20; // 20 px = 1 mm
/** 100 % zoom: 1 m = 100 px. */
export const BASE_SCALE = 0.1;
export const HISTORY_LIMIT = 300;
const COALESCE_MS = 1500;

export interface EditorState {
  doc: ProjectDoc | null;
  past: HistoryEntry[];
  future: HistoryEntry[];
  selection: string[];
  selectedBackgroundId: string | null;
  view: View;
  viewport: { width: number; height: number };
  tool: ToolId;
  drawKind: ObjectKind;
  /** User toggle; holding Alt disables snapping temporarily as well. */
  snapping: boolean;
  workspace: Workspace;
  saveStatus: SaveStatus;
  saveError: string | null;
  lastSavedAt: string | null;
  clipboard: ClipboardPayload | null;
  pasteSerial: number;
  gesture: { base: ProjectDoc; selection: string[] } | null;
  vertexEditId: string | null;
  cursorWorld: Vec | null;
  /** Transient message shown in the status bar. */
  flash: { text: string; kind: 'info' | 'error'; at: number } | null;

  open(doc: ProjectDoc): void;
  close(): void;
  commit(label: string, recipe: (draft: ProjectDoc) => void, opts?: { coalesceKey?: string; select?: string[] }): void;
  beginGesture(): void;
  updateGesture(recipe: (draft: ProjectDoc) => void): void;
  endGesture(label: string, select?: string[]): void;
  cancelGesture(): void;
  undo(): void;
  redo(): void;
  setSelection(ids: string[], mode?: 'replace' | 'add' | 'toggle'): void;
  selectBackground(id: string | null): void;
  setView(view: View): void;
  setViewport(width: number, height: number): void;
  zoomAt(factor: number, screenPoint: Vec): void;
  zoomTo(bounds: Bounds | null, padding?: number): void;
  fitToContent(): void;
  zoomToSelection(): void;
  setTool(tool: ToolId, kind?: ObjectKind): void;
  setSnapping(v: boolean): void;
  setWorkspace(w: Workspace): void;
  setSaveStatus(status: SaveStatus, error?: string | null): void;
  setClipboard(c: ClipboardPayload | null): void;
  setVertexEdit(id: string | null): void;
  setCursorWorld(p: Vec | null): void;
  showFlash(text: string, kind?: 'info' | 'error'): void;
}

const initialView: View = { scale: BASE_SCALE, x: 80, y: 80 };

function touch(draft: ProjectDoc): void {
  draft.meta.updatedAt = new Date().toISOString();
}

function validSelection(doc: ProjectDoc, ids: string[]): string[] {
  return ids.filter((id) => !!doc.objects[id]);
}

export const useEditor = create<EditorState>()((set, get) => ({
  doc: null,
  past: [],
  future: [],
  selection: [],
  selectedBackgroundId: null,
  view: initialView,
  viewport: { width: 800, height: 600 },
  tool: 'select',
  drawKind: 'bed',
  snapping: true,
  workspace: 'design',
  saveStatus: 'saved',
  saveError: null,
  lastSavedAt: null,
  clipboard: null,
  pasteSerial: 0,
  gesture: null,
  vertexEditId: null,
  cursorWorld: null,
  flash: null,

  open(doc) {
    set({
      doc,
      past: [],
      future: [],
      selection: [],
      selectedBackgroundId: null,
      tool: 'select',
      workspace: 'design',
      saveStatus: 'saved',
      saveError: null,
      lastSavedAt: doc.meta.updatedAt,
      gesture: null,
      vertexEditId: null,
      pasteSerial: 0,
    });
  },

  close() {
    set({ doc: null, past: [], future: [], selection: [], selectedBackgroundId: null, gesture: null, vertexEditId: null });
  },

  commit(label, recipe, opts = {}) {
    const { doc, past, selection, gesture } = get();
    if (!doc) return;
    if (gesture) get().endGesture('Edit');
    const next = produce(doc, (d) => {
      recipe(d);
      touch(d);
    });
    if (next === doc) return;
    const now = Date.now();
    const last = past[past.length - 1];
    const coalesce = opts.coalesceKey && last?.coalesceKey === opts.coalesceKey && now - last.time < COALESCE_MS;
    const newPast = coalesce
      ? [...past.slice(0, -1), { ...last, time: now }]
      : [...past, { doc, selection, label, time: now, coalesceKey: opts.coalesceKey }].slice(-HISTORY_LIMIT);
    set({
      doc: next,
      past: newPast,
      future: [],
      selection: validSelection(next, opts.select ?? selection),
      saveStatus: 'pending',
    });
  },

  beginGesture() {
    const { doc, selection } = get();
    if (!doc) return;
    set({ gesture: { base: doc, selection } });
  },

  updateGesture(recipe) {
    const { doc, gesture } = get();
    if (!doc || !gesture) return;
    // Always apply the gesture relative to the base so accumulated drags are exact.
    const next = produce(gesture.base, (d) => {
      recipe(d);
    });
    set({ doc: next });
  },

  endGesture(label, select) {
    const { doc, gesture, past } = get();
    if (!doc || !gesture) return;
    if (doc === gesture.base) {
      set({ gesture: null, ...(select ? { selection: validSelection(doc, select) } : {}) });
      return;
    }
    const final = produce(doc, touch);
    set({
      doc: final,
      gesture: null,
      past: [...past, { doc: gesture.base, selection: gesture.selection, label, time: Date.now() }].slice(-HISTORY_LIMIT),
      future: [],
      saveStatus: 'pending',
      ...(select ? { selection: validSelection(final, select) } : {}),
    });
  },

  cancelGesture() {
    const { gesture } = get();
    if (!gesture) return;
    set({ doc: gesture.base, gesture: null });
  },

  undo() {
    const { doc, past, future, selection, gesture } = get();
    if (!doc) return;
    if (gesture) {
      get().cancelGesture();
      return;
    }
    const entry = past[past.length - 1];
    if (!entry) return;
    set({
      doc: entry.doc,
      past: past.slice(0, -1),
      future: [...future, { doc, selection, label: entry.label, time: Date.now() }],
      selection: validSelection(entry.doc, entry.selection),
      saveStatus: 'pending',
      vertexEditId: null,
    });
    get().showFlash(`Undo: ${entry.label}`);
  },

  redo() {
    const { doc, past, future, selection } = get();
    if (!doc) return;
    const entry = future[future.length - 1];
    if (!entry) return;
    set({
      doc: entry.doc,
      future: future.slice(0, -1),
      past: [...past, { doc, selection, label: entry.label, time: Date.now() }],
      selection: validSelection(entry.doc, entry.selection),
      saveStatus: 'pending',
      vertexEditId: null,
    });
    get().showFlash(`Redo: ${entry.label}`);
  },

  setSelection(ids, mode = 'replace') {
    const { doc, selection } = get();
    if (!doc) return;
    const expanded = expandToGroups(doc, ids);
    let next: string[];
    if (mode === 'replace') next = expanded;
    else if (mode === 'add') next = [...new Set([...selection, ...expanded])];
    else {
      const cur = new Set(selection);
      const allSelected = expanded.every((id) => cur.has(id));
      for (const id of expanded) {
        if (allSelected) cur.delete(id);
        else cur.add(id);
      }
      next = [...cur];
    }
    set({ selection: next, selectedBackgroundId: next.length ? null : get().selectedBackgroundId, vertexEditId: null });
  },

  selectBackground(id) {
    set({ selectedBackgroundId: id, selection: id ? [] : get().selection });
  },

  setView(view) {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale));
    set({ view: { ...view, scale } });
  },

  setViewport(width, height) {
    set({ viewport: { width, height } });
  },

  zoomAt(factor, p) {
    const { view } = get();
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor));
    const k = scale / view.scale;
    set({ view: { scale, x: p.x - (p.x - view.x) * k, y: p.y - (p.y - view.y) * k } });
  },

  zoomTo(bounds, padding = 48) {
    const { viewport } = get();
    if (!bounds) {
      set({ view: initialView });
      return;
    }
    const w = Math.max(bounds.maxX - bounds.minX, 1000);
    const h = Math.max(bounds.maxY - bounds.minY, 1000);
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min((viewport.width - padding * 2) / w, (viewport.height - padding * 2) / h)));
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    set({ view: { scale, x: viewport.width / 2 - cx * scale, y: viewport.height / 2 - cy * scale } });
  },

  fitToContent() {
    const { doc } = get();
    if (!doc) return;
    get().zoomTo(contentBounds(doc));
  },

  zoomToSelection() {
    const { doc, selection } = get();
    if (!doc || !selection.length) return;
    get().zoomTo(selectionBounds(doc, selection), 96);
  },

  setTool(tool, kind) {
    set({ tool, ...(kind ? { drawKind: kind } : {}), vertexEditId: null });
  },
  setSnapping(v) {
    set({ snapping: v });
  },
  setWorkspace(w) {
    set({ workspace: w });
  },
  setSaveStatus(status, error = null) {
    set({ saveStatus: status, saveError: error, ...(status === 'saved' ? { lastSavedAt: new Date().toISOString() } : {}) });
  },
  setClipboard(c) {
    set({ clipboard: c, pasteSerial: 0 });
  },
  setVertexEdit(id) {
    set({ vertexEditId: id });
  },
  setCursorWorld(p) {
    set({ cursorWorld: p });
  },
  showFlash(text, kind = 'info') {
    set({ flash: { text, kind, at: Date.now() } });
  },
}));

export const editorApi = useEditor;

export function screenToWorld(view: View, p: Vec): Vec {
  return { x: (p.x - view.x) / view.scale, y: (p.y - view.y) / view.scale };
}

export function worldToScreen(view: View, p: Vec): Vec {
  return { x: p.x * view.scale + view.x, y: p.y * view.scale + view.y };
}

export function zoomPercent(view: View): number {
  return Math.round((view.scale / BASE_SCALE) * 100);
}
