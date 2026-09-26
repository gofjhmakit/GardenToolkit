/**
 * Editor actions shared by menus, keyboard shortcuts, context menus and
 * toolbar buttons. Each action wraps editor commands in a named undo step.
 */
import { boundsCenter, boundsIntersect, type Vec } from '../../domain/geometry';
import { isObjectLocked, isObjectVisible, objectsInPaintOrder } from '../../domain/projectFactory';
import {
  alignObjects,
  copySelection,
  deleteObjects,
  distributeObjects,
  duplicateObjects,
  groupObjects,
  moveObjects,
  parseClipboardText,
  pasteObjects,
  reorderObjects,
  selectionBounds,
  setHidden,
  setLocked,
  ungroupObjects,
  removeBackground,
  type AlignOp,
  type ClipboardPayload,
  type ZOrderOp,
} from '../../editor/commands';
import { editorApi, screenToWorld } from '../../editor/store';
import { toast } from '../components/feedback';
import { t, tn } from '../../i18n';

const st = () => editorApi.getState();

function editableSelection(): string[] {
  const { doc, selection } = st();
  if (!doc) return [];
  return selection.filter((id) => doc.objects[id] && !isObjectLocked(doc, doc.objects[id]));
}

export function selectAll(): void {
  const { doc } = st();
  if (!doc) return;
  st().setSelection(objectsInPaintOrder(doc).filter((o) => isObjectVisible(doc, o) && !isObjectLocked(doc, o)).map((o) => o.id));
}

export function deleteSelection(): void {
  const { selectedBackgroundId, doc } = st();
  if (selectedBackgroundId && doc) {
    const bg = doc.backgrounds.find((b) => b.id === selectedBackgroundId);
    if (bg && !bg.locked) {
      st().commit('Remove blueprint', (d) => removeBackground(d, selectedBackgroundId));
      st().selectBackground(null);
    }
    return;
  }
  const ids = editableSelection();
  if (!ids.length) return;
  st().commit(ids.length === 1 ? 'Delete object' : `Delete ${ids.length} objects`, (d) => deleteObjects(d, ids), { select: [] });
}

export function copyToClipboard(event?: ClipboardEvent): boolean {
  const { doc, selection } = st();
  if (!doc || !selection.length) return false;
  const payload = copySelection(doc, selection);
  if (!payload) return false;
  st().setClipboard(payload);
  const text = JSON.stringify(payload);
  if (event?.clipboardData) {
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
  } else {
    navigator.clipboard?.writeText(text).catch(() => undefined);
  }
  st().showFlash(tn('Copied {{count}} objects', payload.objects.length));
  return true;
}

export function cutToClipboard(event?: ClipboardEvent): void {
  if (!copyToClipboard(event)) return;
  const ids = editableSelection();
  st().commit('Cut', (d) => deleteObjects(d, ids), { select: [] });
}

function pasteOffset(payload: ClipboardPayload): Vec {
  const { doc, view, viewport, pasteSerial } = st();
  const grid = doc?.settings.gridSizeMm ?? 500;
  const step = Math.max(grid, 20 / view.scale);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const o of payload.objects) {
    minX = Math.min(minX, o.transform.x);
    minY = Math.min(minY, o.transform.y);
    maxX = Math.max(maxX, o.transform.x);
    maxY = Math.max(maxY, o.transform.y);
  }
  const src = { minX, minY, maxX, maxY };
  const a = screenToWorld(view, { x: 0, y: 0 });
  const b = screenToWorld(view, { x: viewport.width, y: viewport.height });
  const visible = boundsIntersect(src, { minX: a.x, minY: a.y, maxX: b.x, maxY: b.y });
  if (visible) return { x: step * (pasteSerial + 1), y: step * (pasteSerial + 1) };
  // Paste into the middle of the current view.
  const c = boundsCenter(src);
  const vc = screenToWorld(view, { x: viewport.width / 2, y: viewport.height / 2 });
  return { x: vc.x - c.x, y: vc.y - c.y };
}

export function pastePayload(payload: ClipboardPayload): void {
  const offset = pasteOffset(payload);
  let ids: string[] = [];
  st().commit('Paste', (d) => {
    ids = pasteObjects(d, payload, offset);
  });
  editorApi.setState({ pasteSerial: st().pasteSerial + 1 });
  st().setSelection(ids);
}

export function pasteFromEvent(e: ClipboardEvent): boolean {
  const text = e.clipboardData?.getData('text/plain') ?? '';
  const external = parseClipboardText(text);
  if (external) {
    e.preventDefault();
    pastePayload(external);
    return true;
  }
  const file = [...(e.clipboardData?.files ?? [])].find((f) => /^image\/(png|jpeg|webp)$/.test(f.type));
  if (file) {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('gtk:import-blueprint-file', { detail: { file } }));
    return true;
  }
  const internal = st().clipboard;
  if (internal) {
    e.preventDefault();
    pastePayload(internal);
    return true;
  }
  return false;
}

export async function pasteFromMenu(): Promise<void> {
  try {
    const text = await navigator.clipboard.readText();
    const external = parseClipboardText(text);
    if (external) {
      pastePayload(external);
      return;
    }
  } catch {
    /* permission denied — fall back to the internal clipboard */
  }
  const internal = st().clipboard;
  if (internal) pastePayload(internal);
  else toast('info', t('Nothing to paste.'));
}

export function duplicateSelection(): void {
  const ids = editableSelection();
  if (!ids.length) return;
  const grid = st().doc?.settings.gridSizeMm ?? 500;
  let created: string[] = [];
  st().commit('Duplicate', (d) => {
    created = duplicateObjects(d, ids, { x: grid, y: grid });
  });
  st().setSelection(created);
}

export function groupSelection(): void {
  const ids = editableSelection();
  if (ids.length < 2) return;
  st().commit('Group', (d) => void groupObjects(d, ids));
}

export function ungroupSelection(): void {
  const ids = editableSelection();
  if (!ids.length) return;
  st().commit('Ungroup', (d) => ungroupObjects(d, ids));
}

export function lockSelection(locked: boolean): void {
  const ids = st().selection;
  if (!ids.length) return;
  st().commit(locked ? 'Lock' : 'Unlock', (d) => setLocked(d, ids, locked));
}

export function hideSelection(): void {
  const ids = st().selection;
  if (!ids.length) return;
  st().commit('Hide', (d) => setHidden(d, ids, true), { select: [] });
}

export function showAllHidden(): void {
  const { doc } = st();
  if (!doc) return;
  const ids = Object.values(doc.objects).filter((o) => o.hidden).map((o) => o.id);
  if (!ids.length) return;
  st().commit('Show hidden objects', (d) => setHidden(d, ids, false), { select: ids });
}

export function zOrder(op: ZOrderOp): void {
  const ids = editableSelection();
  if (!ids.length) return;
  const label = { forward: 'Bring forward', backward: 'Send backward', front: 'Bring to front', back: 'Send to back' }[op];
  st().commit(label, (d) => reorderObjects(d, ids, op));
}

export function align(op: AlignOp): void {
  const ids = editableSelection();
  if (ids.length < 2) return;
  st().commit('Align', (d) => alignObjects(d, ids, op));
}

export function distribute(axis: 'x' | 'y'): void {
  const ids = editableSelection();
  if (ids.length < 3) return;
  st().commit('Distribute', (d) => distributeObjects(d, ids, axis));
}

export function nudge(dx: number, dy: number): void {
  const ids = editableSelection();
  if (ids.length) {
    st().commit('Nudge', (d) => moveObjects(d, ids, dx, dy), { coalesceKey: `nudge:${ids.join(',')}` });
    return;
  }
  const { selectedBackgroundId, doc } = st();
  const bg = doc?.backgrounds.find((b) => b.id === selectedBackgroundId);
  if (bg && !bg.locked) {
    st().commit(
      'Nudge blueprint',
      (d) => {
        const b = d.backgrounds.find((x) => x.id === bg.id)!;
        b.transform.x += dx;
        b.transform.y += dy;
      },
      { coalesceKey: `nudge-bg:${bg.id}` },
    );
  }
}

export function selectionInfo() {
  const { doc, selection } = st();
  if (!doc) return { count: 0, bounds: null };
  return { count: selection.length, bounds: selectionBounds(doc, selection) };
}
