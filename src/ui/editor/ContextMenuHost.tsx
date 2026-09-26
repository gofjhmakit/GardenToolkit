import { useEffect, useState } from 'react';
import { Menu, type MenuEntry } from '../components/Menu';
import { useEditor } from '../../editor/store';
import { kindInfo } from '../../domain/objectKinds';
import {
  copyToClipboard,
  cutToClipboard,
  deleteSelection,
  duplicateSelection,
  groupSelection,
  hideSelection,
  lockSelection,
  pasteFromMenu,
  ungroupSelection,
  zOrder,
} from './actions';
import { t } from '../../i18n';

export function ContextMenuHost() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const on = (e: Event) => setPos((e as CustomEvent<{ x: number; y: number }>).detail);
    window.addEventListener('gtk:context-menu', on);
    return () => window.removeEventListener('gtk:context-menu', on);
  }, []);
  if (!pos) return null;
  const s = useEditor.getState();
  const doc = s.doc!;
  const sel = s.selection;
  const plantable = sel.filter((id) => doc.objects[id] && kindInfo(doc.objects[id].kind).plantable);
  const anyLocked = sel.some((id) => doc.objects[id]?.locked);
  const entries: MenuEntry[] = sel.length
    ? [
        ...(plantable.length ? [{ label: plantable.length > 1 ? t('Add plants to {{count}} areas…', { count: plantable.length }) : t('Add plants to this area…'), onSelect: () => window.dispatchEvent(new CustomEvent('gtk:add-plants', { detail: { ids: plantable } })) } as MenuEntry, { type: 'separator' } as MenuEntry] : []),
        { label: t('Cut'), shortcut: 'Mod+X', onSelect: () => cutToClipboard() },
        { label: t('Copy'), shortcut: 'Mod+C', onSelect: () => void copyToClipboard() },
        { label: t('Paste'), shortcut: 'Mod+V', onSelect: () => void pasteFromMenu() },
        { label: t('Duplicate'), shortcut: 'Mod+D', onSelect: duplicateSelection },
        { label: t('Delete'), shortcut: 'Del', onSelect: deleteSelection },
        { type: 'separator' },
        { label: t('Group'), shortcut: 'Mod+G', disabled: sel.length < 2, onSelect: groupSelection },
        { label: t('Ungroup'), shortcut: 'Mod+Shift+G', onSelect: ungroupSelection },
        { label: anyLocked ? t('Unlock') : t('Lock'), shortcut: 'Mod+Shift+L', onSelect: () => lockSelection(!anyLocked) },
        { label: t('Hide'), shortcut: 'Mod+Shift+H', onSelect: hideSelection },
        { type: 'separator' },
        { label: t('Bring to front'), onSelect: () => zOrder('front') },
        { label: t('Send to back'), onSelect: () => zOrder('back') },
        { label: t('Zoom to selection'), onSelect: s.zoomToSelection },
      ]
    : [
        { label: t('Paste'), shortcut: 'Mod+V', onSelect: () => void pasteFromMenu() },
        { label: t('Import blueprint…'), onSelect: () => window.dispatchEvent(new CustomEvent('gtk:import-blueprint')) },
        { label: t('Fit to screen'), onSelect: s.fitToContent },
      ];
  return <Menu label={t('Context menu')} entries={entries} anchor={pos} onClose={() => setPos(null)} />;
}
