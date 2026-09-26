import { useState } from 'react';
import { Menu as MenuIcon } from 'lucide-react';
import { Menu, type MenuEntry } from '../components/Menu';
import { useEditor } from '../../editor/store';
import { usePrefs } from '../../app/prefs';
import { pickFile, pickFiles, downloadBlob, safeFileName } from '../../lib/download';
import {
  closeProject,
  exportAllProjects,
  exportProjectJson,
  exportProjectPackage,
  importBlueprint,
  importProjectFiles,
  PROJECT_FILE_ACCEPT,
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
import { APP_VERSION } from '../../persistence/projectFile';
import { makeLookup } from '../../app/lookup';
import { t } from '../../i18n';

type MenuId = 'file' | 'edit' | 'view' | 'arrange' | 'help';

export function MenuBar({ onHome, onHelp, compact = false }: { onHome: () => void; onHelp: () => void; compact?: boolean }) {
  const [open, setOpen] = useState<{ id: MenuId | 'all'; x: number; y: number } | null>(null);
  const s = useEditor();
  const prefs = usePrefs();
  const doc = s.doc!;
  const sel = s.selection.length;
  const commitSetting = (label: string, patch: Partial<typeof doc.settings>) => s.commit(label, (d) => Object.assign(d.settings, patch));

  const menus: Record<MenuId, () => MenuEntry[]> = {
    file: () => [
      { label: t('All projects…'), onSelect: onHome },
      { label: t('Rename project…'), onSelect: async () => {
        const name = await promptAsync({ title: t('Rename project'), label: t('Project name'), value: doc.meta.name, confirmLabel: t('Rename') });
        if (name) s.commit('Rename project', (d) => void (d.meta.name = name));
      } },
      { label: t('Save version snapshot'), shortcut: 'Mod+S', onSelect: async () => {
        await flushSave();
        await createSnapshot(useEditor.getState().doc!, 'Saved version', false);
        toast('ok', t('Saved locally'), [t('A version snapshot was stored. Restore it from Garden settings → Versions.')]);
      } },
      { label: t('Save as…'), onSelect: async () => {
        const name = await promptAsync({ title: t('Save as a new project'), label: t('New project name'), value: t("{{name}} (copy)", { name: doc.meta.name }), confirmLabel: t('Save copy') });
        if (!name) return;
        const id = await saveProjectAs(doc, name);
        toast('ok', t('Saved as "{{name}}"', { name }));
        navigate(`#/p/${id}`);
      } },
      { type: 'separator' },
      { label: t('Import blueprint (image or PDF)…'), onSelect: async () => {
        const f = await pickFile('image/png,image/jpeg,image/webp,application/pdf');
        if (f) await importBlueprint(f);
      } },
      { label: t('Import project files…'), onSelect: async () => {
        const files = await pickFiles(PROJECT_FILE_ACCEPT);
        const ids = await importProjectFiles(files);
        if (ids.length === 1) navigate(`#/p/${ids[0]}`);
        else if (ids.length > 1) toast('info', t('The imported projects are listed under All projects.'));
      } },
      { type: 'separator' },
      { label: t('Export project package (.gtkproject)'), onSelect: () => void exportProjectPackage(doc) },
      { label: t('Export project as JSON (images embedded)'), onSelect: () => void exportProjectJson(doc, true) },
      { label: t('Export all projects (.gtkbackup)'), onSelect: () => void exportAllProjects() },
      { label: t('Export plan as SVG'), onSelect: async () => {
        const lookup = makeLookup(usePlants.getState().catalog, doc);
        const { exportPlanSvg } = await import('../../reports/planExport');
        downloadBlob(await exportPlanSvg(doc, lookup), `${safeFileName(doc.meta.name)}-plan.svg`);
      } },
      { label: t('Export plan as PNG'), onSelect: async () => {
        const lookup = makeLookup(usePlants.getState().catalog, doc);
        const { exportPlanPng } = await import('../../reports/planExport');
        downloadBlob(await exportPlanPng(doc, lookup, 3000), `${safeFileName(doc.meta.name)}-plan.png`);
      } },
      { label: t('Reports & PDF documents…'), onSelect: () => s.setWorkspace('reports') },
      { type: 'separator' },
      { label: t('Delete project…'), onSelect: async () => {
        const ok = await confirmAsync({ title: t('Delete project?'), message: t('"{{name}}" and its images and version history will be permanently removed from this browser.\nExport a backup first if you may need it later.', { name: doc.meta.name }), confirmLabel: t('Delete permanently'), danger: true });
        if (!ok) return;
        const id = doc.id;
        await closeProject();
        await deleteProject(id);
        navigate('#/');
      } },
      { label: t('Close project'), onSelect: onHome },
    ],
    edit: () => [
      { label: s.past.length ? t('Undo {{action}}', { action: t(s.past[s.past.length - 1].label) }) : t('Undo'), shortcut: 'Mod+Z', disabled: !s.past.length, onSelect: s.undo },
      { label: s.future.length ? t('Redo {{action}}', { action: t(s.future[s.future.length - 1].label) }) : t('Redo'), shortcut: 'Mod+Shift+Z', disabled: !s.future.length, onSelect: s.redo },
      { type: 'separator' },
      { label: t('Cut'), shortcut: 'Mod+X', disabled: !sel, onSelect: () => cutToClipboard() },
      { label: t('Copy'), shortcut: 'Mod+C', disabled: !sel, onSelect: () => void copyToClipboard() },
      { label: t('Paste'), shortcut: 'Mod+V', onSelect: () => void pasteFromMenu() },
      { label: t('Duplicate'), shortcut: 'Mod+D', disabled: !sel, onSelect: duplicateSelection },
      { label: t('Delete'), shortcut: 'Del', disabled: !sel && !s.selectedBackgroundId, onSelect: deleteSelection },
      { type: 'separator' },
      { label: t('Select all'), shortcut: 'Mod+A', onSelect: selectAll },
      { label: t('Deselect'), shortcut: 'Esc', disabled: !sel, onSelect: () => s.setSelection([]) },
    ],
    view: () => [
      { label: t('Fit to screen'), shortcut: 'Shift+1', onSelect: s.fitToContent },
      { label: t('Zoom to selection'), shortcut: 'Shift+2', disabled: !sel, onSelect: s.zoomToSelection },
      { label: t('Zoom 100% (1 m = 100 px)'), shortcut: 'Mod+0', onSelect: () => s.zoomAt(0.1 / s.view.scale, { x: s.viewport.width / 2, y: s.viewport.height / 2 }) },
      { type: 'separator' },
      { label: t('Grid'), checked: doc.settings.showGrid, onSelect: () => commitSetting('Toggle grid', { showGrid: !doc.settings.showGrid }) },
      { label: t('Rulers'), checked: doc.settings.showRulers, onSelect: () => commitSetting('Toggle rulers', { showRulers: !doc.settings.showRulers }) },
      { label: t('Plant positions in beds'), checked: doc.settings.showPlantMarkers, onSelect: () => commitSetting('Toggle plant markers', { showPlantMarkers: !doc.settings.showPlantMarkers }) },
      { type: 'separator' },
      { label: t('Snap to grid'), checked: doc.settings.snapToGrid, onSelect: () => commitSetting('Toggle grid snapping', { snapToGrid: !doc.settings.snapToGrid }) },
      { label: t('Snap to objects & guides'), checked: doc.settings.snapToObjects, onSelect: () => commitSetting('Toggle object snapping', { snapToObjects: !doc.settings.snapToObjects }) },
      { type: 'separator' },
      { label: t('Layers panel'), checked: prefs.showLeftPanel, onSelect: () => prefs.set({ showLeftPanel: !prefs.showLeftPanel }) },
      { label: t('Inspector panel'), checked: prefs.showRightPanel, onSelect: () => prefs.set({ showRightPanel: !prefs.showRightPanel }) },
      { label: t('Mouse wheel zooms (otherwise pans)'), checked: prefs.wheel === 'zoom', onSelect: () => prefs.set({ wheel: prefs.wheel === 'zoom' ? 'pan' : 'zoom' }) },
      { type: 'label', label: t('Theme') },
      { label: t('System'), checked: prefs.theme === 'system', onSelect: () => prefs.set({ theme: 'system' }) },
      { label: t('Light'), checked: prefs.theme === 'light', onSelect: () => prefs.set({ theme: 'light' }) },
      { label: t('Dark'), checked: prefs.theme === 'dark', onSelect: () => prefs.set({ theme: 'dark' }) },
    ],
    arrange: () => [
      { label: t('Group'), shortcut: 'Mod+G', disabled: sel < 2, onSelect: groupSelection },
      { label: t('Ungroup'), shortcut: 'Mod+Shift+G', disabled: !sel, onSelect: ungroupSelection },
      { type: 'separator' },
      { label: t('Lock'), shortcut: 'Mod+Shift+L', disabled: !sel, onSelect: () => lockSelection(true) },
      { label: t('Unlock'), disabled: !sel, onSelect: () => lockSelection(false) },
      { label: t('Hide'), shortcut: 'Mod+Shift+H', disabled: !sel, onSelect: hideSelection },
      { label: t('Show all hidden objects'), onSelect: showAllHidden },
      { type: 'separator' },
      { label: t('Bring to front'), shortcut: 'Mod+Shift+]', disabled: !sel, onSelect: () => zOrder('front') },
      { label: t('Bring forward'), shortcut: 'Mod+]', disabled: !sel, onSelect: () => zOrder('forward') },
      { label: t('Send backward'), shortcut: 'Mod+[', disabled: !sel, onSelect: () => zOrder('backward') },
      { label: t('Send to back'), shortcut: 'Mod+Shift+[', disabled: !sel, onSelect: () => zOrder('back') },
      { type: 'separator' },
      { label: t('Align left edges'), disabled: sel < 2, onSelect: () => align('left') },
      { label: t('Align horizontal centres'), disabled: sel < 2, onSelect: () => align('hcenter') },
      { label: t('Align right edges'), disabled: sel < 2, onSelect: () => align('right') },
      { label: t('Align top edges'), disabled: sel < 2, onSelect: () => align('top') },
      { label: t('Align vertical centres'), disabled: sel < 2, onSelect: () => align('vcenter') },
      { label: t('Align bottom edges'), disabled: sel < 2, onSelect: () => align('bottom') },
      { label: t('Distribute horizontally'), disabled: sel < 3, onSelect: () => distribute('x') },
      { label: t('Distribute vertically'), disabled: sel < 3, onSelect: () => distribute('y') },
    ],
    help: () => [
      { label: t('Keyboard shortcuts'), shortcut: '?', onSelect: onHelp },
      { label: t('Plant data sources & licences'), onSelect: () => s.setWorkspace('plants') },
      { type: 'separator' },
      { type: 'label', label: `Garden Toolkit ${APP_VERSION}` },
    ],
  };

  const labels: [MenuId, string][] = [
    ['file', t('File')],
    ['edit', t('Edit')],
    ['view', t('View')],
    ['arrange', t('Arrange')],
    ['help', t('Help')],
  ];
  if (compact) {
    // Phones: one button, every menu as a labelled section of a single list.
    const all = (): MenuEntry[] =>
      labels.flatMap(([id, label], i) => [...(i ? [{ type: 'separator' as const }] : []), { type: 'label' as const, label }, ...menus[id]()]);
    return (
      <nav className="menubar compact" aria-label={t('Main menu')}>
        <button
          type="button"
          className="icon-btn"
          aria-label={t('Menu')}
          title={t('Menu')}
          aria-haspopup="menu"
          aria-expanded={open?.id === 'all'}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setOpen(open ? null : { id: 'all', x: r.left, y: r.bottom + 2 });
          }}
        >
          <MenuIcon size={18} strokeWidth={1.75} />
        </button>
        {open && <Menu label={t('Menu')} entries={all()} anchor={{ x: open.x, y: open.y }} onClose={() => setOpen(null)} />}
      </nav>
    );
  }
  return (
    <nav className="menubar" aria-label={t('Main menu')}>
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
      {open && <Menu label={labels.find((l) => l[0] === open.id)![1]} entries={menus[open.id as MenuId]()} anchor={{ x: open.x, y: open.y }} onClose={() => setOpen(null)} />}
    </nav>
  );
}
