import { useEffect } from 'react';
import { editorApi, type ToolId } from '../../editor/store';
import { isEditableTarget, isMac } from '../components/platform';
import {
  copyToClipboard,
  cutToClipboard,
  deleteSelection,
  duplicateSelection,
  groupSelection,
  hideSelection,
  lockSelection,
  nudge,
  pasteFromEvent,
  selectAll,
  ungroupSelection,
  zOrder,
} from './actions';
import { flushSave } from '../../app/autosave';
import { createSnapshot } from '../../persistence/projectRepo';

export const TOOL_KEYS: Record<string, ToolId> = {
  v: 'select',
  h: 'hand',
  r: 'rect',
  o: 'ellipse',
  p: 'polygon',
  f: 'freehand',
  l: 'polyline',
  t: 'text',
  d: 'dimension',
  m: 'measure',
  k: 'calibrate',
};

export interface ShortcutDoc {
  keys: string;
  label: string;
  group: string;
}

export const SHORTCUTS: ShortcutDoc[] = [
  { keys: 'Mod+Z', label: 'Undo', group: 'Edit' },
  { keys: 'Mod+Shift+Z', label: 'Redo', group: 'Edit' },
  { keys: 'Mod+C', label: 'Copy', group: 'Edit' },
  { keys: 'Mod+X', label: 'Cut', group: 'Edit' },
  { keys: 'Mod+V', label: 'Paste', group: 'Edit' },
  { keys: 'Mod+D', label: 'Duplicate', group: 'Edit' },
  { keys: 'Del', label: 'Delete', group: 'Edit' },
  { keys: 'Mod+A', label: 'Select all', group: 'Edit' },
  { keys: 'Esc', label: 'Deselect / cancel drawing', group: 'Edit' },
  { keys: 'Mod+S', label: 'Save a version snapshot', group: 'Edit' },
  { keys: 'Mod+G', label: 'Group', group: 'Arrange' },
  { keys: 'Mod+Shift+G', label: 'Ungroup', group: 'Arrange' },
  { keys: 'Mod+Shift+L', label: 'Lock / unlock', group: 'Arrange' },
  { keys: 'Mod+Shift+H', label: 'Hide', group: 'Arrange' },
  { keys: 'Mod+]', label: 'Bring forward', group: 'Arrange' },
  { keys: 'Mod+[', label: 'Send backward', group: 'Arrange' },
  { keys: 'Mod+Shift+]', label: 'Bring to front', group: 'Arrange' },
  { keys: 'Mod+Shift+[', label: 'Send to back', group: 'Arrange' },
  { keys: 'Arrows', label: 'Nudge 1 cm (Shift: one grid step)', group: 'Arrange' },
  { keys: 'Shift+1', label: 'Fit to screen', group: 'View' },
  { keys: 'Shift+2', label: 'Zoom to selection', group: 'View' },
  { keys: 'Mod+= / Mod+-', label: 'Zoom in / out', group: 'View' },
  { keys: 'Space+drag', label: 'Pan', group: 'View' },
  { keys: 'V', label: 'Select tool', group: 'Tools' },
  { keys: 'H', label: 'Hand (pan) tool', group: 'Tools' },
  { keys: 'R', label: 'Rectangle', group: 'Tools' },
  { keys: 'O', label: 'Ellipse / circle', group: 'Tools' },
  { keys: 'P', label: 'Polygon', group: 'Tools' },
  { keys: 'F', label: 'Freehand area', group: 'Tools' },
  { keys: 'L', label: 'Line / path', group: 'Tools' },
  { keys: 'T', label: 'Text label', group: 'Tools' },
  { keys: 'D', label: 'Dimension', group: 'Tools' },
  { keys: 'M', label: 'Measure', group: 'Tools' },
  { keys: 'K', label: 'Calibrate blueprint scale', group: 'Tools' },
  { keys: 'Mod (hold)', label: 'Temporarily disable snapping while dragging', group: 'Tools' },
  { keys: 'Alt+drag', label: 'Duplicate while moving', group: 'Tools' },
  { keys: '?', label: 'Show keyboard shortcuts', group: 'Help' },
];

/** Global editor keyboard shortcuts (platform-aware: ⌘ on macOS, Ctrl elsewhere). */
export function useShortcuts(opts: { onHelp: () => void; enabled: boolean }) {
  useEffect(() => {
    if (!opts.enabled) return;
    const onKey = async (e: KeyboardEvent) => {
      const s = editorApi.getState();
      if (!s.doc) return;
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === 's') {
        e.preventDefault();
        await flushSave();
        const doc = editorApi.getState().doc;
        if (doc) await createSnapshot(doc, 'Saved version', false);
        s.showFlash('Saved locally and stored a version snapshot');
        return;
      }
      if (isEditableTarget(e.target)) return;
      const inDesign = s.workspace === 'design';

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && key === 'y' && !isMac) {
        e.preventDefault();
        s.redo();
        return;
      }
      if (!inDesign) return;
      if (mod && key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }
      if (mod && key === 'd') {
        e.preventDefault();
        duplicateSelection();
        return;
      }
      if (mod && key === 'g') {
        e.preventDefault();
        if (e.shiftKey) ungroupSelection();
        else groupSelection();
        return;
      }
      if (mod && e.shiftKey && key === 'l') {
        e.preventDefault();
        const doc = s.doc;
        const anyUnlocked = s.selection.some((id) => doc.objects[id] && !doc.objects[id].locked);
        lockSelection(anyUnlocked);
        return;
      }
      if (mod && e.shiftKey && key === 'h') {
        e.preventDefault();
        hideSelection();
        return;
      }
      if (mod && (e.code === 'BracketRight' || e.code === 'BracketLeft')) {
        e.preventDefault();
        const fwd = e.code === 'BracketRight';
        zOrder(e.shiftKey ? (fwd ? 'front' : 'back') : fwd ? 'forward' : 'backward');
        return;
      }
      if (mod && (key === '=' || key === '+')) {
        e.preventDefault();
        s.zoomAt(1.25, { x: s.viewport.width / 2, y: s.viewport.height / 2 });
        return;
      }
      if (mod && key === '-') {
        e.preventDefault();
        s.zoomAt(0.8, { x: s.viewport.width / 2, y: s.viewport.height / 2 });
        return;
      }
      if (mod && key === '0') {
        e.preventDefault();
        s.zoomAt(0.1 / s.view.scale, { x: s.viewport.width / 2, y: s.viewport.height / 2 });
        return;
      }
      if (e.shiftKey && (e.code === 'Digit1' || e.code === 'Digit2') && !mod && !e.altKey) {
        e.preventDefault();
        if (e.code === 'Digit1') s.fitToContent();
        else s.zoomToSelection();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelection();
        return;
      }
      if (e.key === 'Escape') {
        if (s.vertexEditId) s.setVertexEdit(null);
        else if (s.tool !== 'select') s.setTool('select');
        else {
          s.setSelection([]);
          s.selectBackground(null);
        }
        return;
      }
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? s.doc.settings.gridSizeMm : 10;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        nudge(dx, dy);
        return;
      }
      if (e.key === '?') {
        opts.onHelp();
        return;
      }
      if (!mod && !e.altKey && !e.shiftKey && TOOL_KEYS[key]) {
        s.setTool(TOOL_KEYS[key]);
      }
    };
    const onCopy = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target) || editorApi.getState().workspace !== 'design') return;
      copyToClipboard(e);
    };
    const onCut = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target) || editorApi.getState().workspace !== 'design') return;
      cutToClipboard(e);
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target) || editorApi.getState().workspace !== 'design') return;
      pasteFromEvent(e);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
    };
  }, [opts.enabled, opts.onHelp]);
}
