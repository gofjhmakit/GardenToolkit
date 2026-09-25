import { useState } from 'react';
import { Menu, type MenuEntry } from '../components/Menu';
import { useEditor } from '../../editor/store';
import { usePrefs } from '../../app/prefs';
import { pickFile, downloadBlob, safeFileName } from '../../lib/download';
import {
  closeProject,
  exportProjectJson,
  exportProjectPackage,
  importBlueprint,
  importProjectFromFile,
  navigate,
  saveProjectAs,
} from '../../app/projectActions';
import { confirmAsync, promptAsync, toast } from '../components/feedback';
import { deleteProject, createSnapshot } from '../../persistence/projectRepo';
import { flushSave } from '../../app/autosave';
import {
  align,
  copyToClipboard,
  cutToClipboard,
  deleteSelection,
  distribute,
  duplicateSelection,
  groupSelection,
  hideSelection,
  lockSelection,
  pasteFromMenu,
  selectAll,
  showAllHidden,
  ungroupSelection,
  zOrder,
} from './actions';
import { usePlants } from '../../app/plantStore';
import { makeLookup } from '../../app/lookup';

type MenuId = 'file' | 'edit' | 'view' | 'arrange' | 'help';

export function MenuBar({ onHome, onHelp }: { onHome: () => void; onHelp: () => void }) {
  const [open, setOpen] = useState<{ id: MenuId; x: number; y: number } | null>(null);
  const s = useEditor();
  const prefs = usePrefs();
  const doc = s.doc!;
  const sel = s.selection.length;
  const commitSetting = (label: string, patch: Partial<typeof doc.settings>) => s.commit(label, (d) => Object.assign(d.settings, patch));

  const menus: Record<MenuId, () => MenuEntry[]> = {
    file: () => [
      { label: 'All projects…', onSelect: onHome },
      { label: 'Rename project…', onSelect: async () => {
        const name = await promptAsync({ title: 'Rename project', label: 'Project name', value: doc.meta.name, confirmLabel: 'Rename' });
        if (name) s.commit('Rename project', (d) => void (d.meta.name = name));
      } },
      { label: 'Save version snapshot', shortcut: 'Mod+S', onSelect: async () => {
        await flushSave();
        await createSnapshot(useEditor.getState().doc!, 'Saved version', false);
        toast('ok', 'Saved locally', ['A version snapshot was stored. Restore it from Garden settings → Versions.']);
      } },
      { label: 'Save as…', onSelect: async () => {
        const name = await promptAsync({ title: 'Save as a new project', label: 'New project name', value: `${doc.meta.name} (copy)`, confirmLabel: 'Save copy' });
        if (!name) return;
        const id = await saveProjectAs(doc, name);
        toast('ok', `Saved as "${name}"`);
        navigate(`#/p/${id}`);
      } },
      { type: 'separator' },
      { label: 'Import blueprint (image or PDF)…', onSelect: async () => {
        const f = await pickFile('image/png,image/jpeg,image/webp,application/pdf');
        if (f) await importBlueprint(f);
      } },
      { label: 'Import project file…', onSelect: async () => {
        const f = await pickFile('.gtkproject,.zip,.json,application/json,application/zip');
        if (!f) return;
        const id = await importProjectFromFile(f);
        if (id) navigate(`#/p/${id}`);
      } },
      { type: 'separator' },
      { label: 'Export project package (.gtkproject)', onSelect: () => void exportProjectPackage(doc) },
      { label: 'Export project as JSON (images embedded)', onSelect: () => void exportProjectJson(doc, true) },
      { label: 'Export plan as SVG', onSelect: async () => {
        const lookup = makeLookup(usePlants.getState().catalog, doc);
        const { exportPlanSvg } = await import('../../reports/planExport');
        downloadBlob(await exportPlanSvg(doc, lookup), `${safeFileName(doc.meta.name)}-plan.svg`);
      } },
      { label: 'Export plan as PNG', onSelect: async () => {
        const lookup = makeLookup(usePlants.getState().catalog, doc);
        const { exportPlanPng } = await import('../../reports/planExport');
        downloadBlob(await exportPlanPng(doc, lookup, 3000), `${safeFileName(doc.meta.name)}-plan.png`);
      } },
      { label: 'Reports & PDF documents…', onSelect: () => s.setWorkspace('reports') },
      { type: 'separator' },
      { label: 'Delete project…', onSelect: async () => {
        const ok = await confirmAsync({ title: 'Delete project?', message: `"${doc.meta.name}" and its images and version history will be permanently removed from this browser.\nExport a backup first if you may need it later.`, confirmLabel: 'Delete permanently', danger: true });
        if (!ok) return;
        const id = doc.id;
        await closeProject();
        await deleteProject(id);
        navigate('#/');
      } },
      { label: 'Close project', onSelect: onHome },
    ],
    edit: () => [
      { label: s.past.length ? `Undo ${s.past[s.past.length - 1].label}` : 'Undo', shortcut: 'Mod+Z', disabled: !s.past.length, onSelect: s.undo },
      { label: s.future.length ? `Redo ${s.future[s.future.length - 1].label}` : 'Redo', shortcut: 'Mod+Shift+Z', disabled: !s.future.length, onSelect: s.redo },
      { type: 'separator' },
      { label: 'Cut', shortcut: 'Mod+X', disabled: !sel, onSelect: () => cutToClipboard() },
      { label: 'Copy', shortcut: 'Mod+C', disabled: !sel, onSelect: () => void copyToClipboard() },
      { label: 'Paste', shortcut: 'Mod+V', onSelect: () => void pasteFromMenu() },
      { label: 'Duplicate', shortcut: 'Mod+D', disabled: !sel, onSelect: duplicateSelection },
      { label: 'Delete', shortcut: 'Del', disabled: !sel && !s.selectedBackgroundId, onSelect: deleteSelection },
      { type: 'separator' },
      { label: 'Select all', shortcut: 'Mod+A', onSelect: selectAll },
      { label: 'Deselect', shortcut: 'Esc', disabled: !sel, onSelect: () => s.setSelection([]) },
    ],
    view: () => [
      { label: 'Fit to screen', shortcut: 'Shift+1', onSelect: s.fitToContent },
      { label: 'Zoom to selection', shortcut: 'Shift+2', disabled: !sel, onSelect: s.zoomToSelection },
      { label: 'Zoom 100% (1 m = 100 px)', shortcut: 'Mod+0', onSelect: () => s.zoomAt(0.1 / s.view.scale, { x: s.viewport.width / 2, y: s.viewport.height / 2 }) },
      { type: 'separator' },
      { label: 'Grid', checked: doc.settings.showGrid, onSelect: () => commitSetting('Toggle grid', { showGrid: !doc.settings.showGrid }) },
      { label: 'Rulers', checked: doc.settings.showRulers, onSelect: () => commitSetting('Toggle rulers', { showRulers: !doc.settings.showRulers }) },
      { label: 'Plant positions in beds', checked: doc.settings.showPlantMarkers, onSelect: () => commitSetting('Toggle plant markers', { showPlantMarkers: !doc.settings.showPlantMarkers }) },
      { type: 'separator' },
      { label: 'Snap to grid', checked: doc.settings.snapToGrid, onSelect: () => commitSetting('Toggle grid snapping', { snapToGrid: !doc.settings.snapToGrid }) },
      { label: 'Snap to objects & guides', checked: doc.settings.snapToObjects, onSelect: () => commitSetting('Toggle object snapping', { snapToObjects: !doc.settings.snapToObjects }) },
      { type: 'separator' },
      { label: 'Layers panel', checked: prefs.showLeftPanel, onSelect: () => prefs.set({ showLeftPanel: !prefs.showLeftPanel }) },
      { label: 'Inspector panel', checked: prefs.showRightPanel, onSelect: () => prefs.set({ showRightPanel: !prefs.showRightPanel }) },
      { label: 'Mouse wheel zooms (otherwise pans)', checked: prefs.wheel === 'zoom', onSelect: () => prefs.set({ wheel: prefs.wheel === 'zoom' ? 'pan' : 'zoom' }) },
      { type: 'label', label: 'Theme' },
      { label: 'System', checked: prefs.theme === 'system', onSelect: () => prefs.set({ theme: 'system' }) },
      { label: 'Light', checked: prefs.theme === 'light', onSelect: () => prefs.set({ theme: 'light' }) },
      { label: 'Dark', checked: prefs.theme === 'dark', onSelect: () => prefs.set({ theme: 'dark' }) },
    ],
    arrange: () => [
      { label: 'Group', shortcut: 'Mod+G', disabled: sel < 2, onSelect: groupSelection },
      { label: 'Ungroup', shortcut: 'Mod+Shift+G', disabled: !sel, onSelect: ungroupSelection },
      { type: 'separator' },
      { label: 'Lock', shortcut: 'Mod+Shift+L', disabled: !sel, onSelect: () => lockSelection(true) },
      { label: 'Unlock', disabled: !sel, onSelect: () => lockSelection(false) },
      { label: 'Hide', shortcut: 'Mod+Shift+H', disabled: !sel, onSelect: hideSelection },
      { label: 'Show all hidden objects', onSelect: showAllHidden },
      { type: 'separator' },
      { label: 'Bring to front', shortcut: 'Mod+Shift+]', disabled: !sel, onSelect: () => zOrder('front') },
      { label: 'Bring forward', shortcut: 'Mod+]', disabled: !sel, onSelect: () => zOrder('forward') },
      { label: 'Send backward', shortcut: 'Mod+[', disabled: !sel, onSelect: () => zOrder('backward') },
      { label: 'Send to back', shortcut: 'Mod+Shift+[', disabled: !sel, onSelect: () => zOrder('back') },
      { type: 'separator' },
      { label: 'Align left edges', disabled: sel < 2, onSelect: () => align('left') },
      { label: 'Align horizontal centres', disabled: sel < 2, onSelect: () => align('hcenter') },
      { label: 'Align right edges', disabled: sel < 2, onSelect: () => align('right') },
      { label: 'Align top edges', disabled: sel < 2, onSelect: () => align('top') },
      { label: 'Align vertical centres', disabled: sel < 2, onSelect: () => align('vcenter') },
      { label: 'Align bottom edges', disabled: sel < 2, onSelect: () => align('bottom') },
      { label: 'Distribute horizontally', disabled: sel < 3, onSelect: () => distribute('x') },
      { label: 'Distribute vertically', disabled: sel < 3, onSelect: () => distribute('y') },
    ],
    help: () => [
      { label: 'Keyboard shortcuts', shortcut: '?', onSelect: onHelp },
      { label: 'Plant data sources & licences', onSelect: () => s.setWorkspace('plants') },
    ],
  };

  const labels: [MenuId, string][] = [
    ['file', 'File'],
    ['edit', 'Edit'],
    ['view', 'View'],
    ['arrange', 'Arrange'],
    ['help', 'Help'],
  ];
  return (
    <nav className="menubar" aria-label="Main menu">
      {labels.map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open?.id === id}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOpen(open?.id === id ? null : { id, x: r.left, y: r.bottom + 2 });
          }}
          onMouseEnter={(e) => {
            if (open && open.id !== id) {
              const r = e.currentTarget.getBoundingClientRect();
              setOpen({ id, x: r.left, y: r.bottom + 2 });
            }
          }}
        >
          {label}
        </button>
      ))}
      {open && <Menu label={labels.find((l) => l[0] === open.id)![1]} entries={menus[open.id]()} anchor={{ x: open.x, y: open.y }} onClose={() => setOpen(null)} />}
    </nav>
  );
}
