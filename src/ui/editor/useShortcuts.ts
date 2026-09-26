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
import { t } from '../../i18n';

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
  { keys: 'Mod+Z', label: t('Undo'), group: t('Edit') },
  { keys: 'Mod+Shift+Z', label: t('Redo'), group: t('Edit') },
  { keys: 'Mod+C', label: t('Copy'), group: t('Edit') },
  { keys: 'Mod+X', label: t('Cut'), group: t('Edit') },
  { keys: 'Mod+V', label: t('Paste'), group: t('Edit') },
  { keys: 'Mod+D', label: t('Duplicate'), group: t('Edit') },
  { keys: 'Del', label: t('Delete'), group: t('Edit') },
  { keys: 'Mod+A', label: t('Select all'), group: t('Edit') },
  { keys: 'Esc', label: t('Deselect / cancel drawing'), group: t('Edit') },
  { keys: 'Mod+S', label: t('Save a version snapshot'), group: t('Edit') },
  { keys: 'Mod+G', label: t('Group'), group: t('Arrange') },
  { keys: 'Mod+Shift+G', label: t('Ungroup'), group: t('Arrange') },
  { keys: 'Mod+Shift+L', label: t('Lock / unlock'), group: t('Arrange') },
  { keys: 'Mod+Shift+H', label: t('Hide'), group: t('Arrange') },
  { keys: 'Mod+]', label: t('Bring forward'), group: t('Arrange') },
  { keys: 'Mod+[', label: t('Send backward'), group: t('Arrange') },
  { keys: 'Mod+Shift+]', label: t('Bring to front'), group: t('Arrange') },
  { keys: 'Mod+Shift+[', label: t('Send to back'), group: t('Arrange') },
  { keys: 'Arrows', label: t('Nudge 1 cm (Shift: one grid step)'), group: t('Arrange') },
  { keys: 'Shift+1', label: t('Fit to screen'), group: t('View') },
  { keys: 'Shift+2', label: t('Zoom to selection'), group: t('View') },
  { keys: 'Mod+= / Mod+-', label: t('Zoom in / out'), group: t('View') },
  { keys: 'Space+drag', label: t('Pan'), group: t('View') },
  { keys: 'V', label: t('Select tool'), group: t('Tools') },
  { keys: 'H', label: t('Hand (pan) tool'), group: t('Tools') },
  { keys: 'R', label: t('Rectangle'), group: t('Tools') },
  { keys: 'O', label: t('Ellipse / circle'), group: t('Tools') },
  { keys: 'P', label: t('Polygon'), group: t('Tools') },
  { keys: 'F', label: t('Freehand area'), group: t('Tools') },
  { keys: 'L', label: t('Line / path'), group: t('Tools') },
  { keys: 'T', label: t('Text label'), group: t('Tools') },
  { keys: 'D', label: t('Dimension'), group: t('Tools') },
  { keys: 'M', label: t('Measure'), group: t('Tools') },
  { keys: 'K', label: t('Calibrate blueprint scale'), group: t('Tools') },
  { keys: 'Mod (hold)', label: t('Temporarily disable snapping while dragging'), group: t('Tools') },
  { keys: 'Alt+drag', label: t('Duplicate while moving'), group: t('Tools') },
  { keys: '?', label: t('Show keyboard shortcuts'), group: t('Help') },
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
        s.showFlash(t('Saved locally and stored a version snapshot'));
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
