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
        ...(plantable.length ? [{ label: `Add plants to ${plantable.length > 1 ? `${plantable.length} areas` : 'this area'}…`, onSelect: () => window.dispatchEvent(new CustomEvent('gtk:add-plants', { detail: { ids: plantable } })) } as MenuEntry, { type: 'separator' } as MenuEntry] : []),
        { label: 'Cut', shortcut: 'Mod+X', onSelect: () => cutToClipboard() },
        { label: 'Copy', shortcut: 'Mod+C', onSelect: () => void copyToClipboard() },
        { label: 'Paste', shortcut: 'Mod+V', onSelect: () => void pasteFromMenu() },
        { label: 'Duplicate', shortcut: 'Mod+D', onSelect: duplicateSelection },
        { label: 'Delete', shortcut: 'Del', onSelect: deleteSelection },
        { type: 'separator' },
        { label: 'Group', shortcut: 'Mod+G', disabled: sel.length < 2, onSelect: groupSelection },
        { label: 'Ungroup', shortcut: 'Mod+Shift+G', onSelect: ungroupSelection },
        { label: anyLocked ? 'Unlock' : 'Lock', shortcut: 'Mod+Shift+L', onSelect: () => lockSelection(!anyLocked) },
        { label: 'Hide', shortcut: 'Mod+Shift+H', onSelect: hideSelection },
        { type: 'separator' },
        { label: 'Bring to front', onSelect: () => zOrder('front') },
        { label: 'Send to back', onSelect: () => zOrder('back') },
        { label: 'Zoom to selection', onSelect: s.zoomToSelection },
      ]
    : [
        { label: 'Paste', shortcut: 'Mod+V', onSelect: () => void pasteFromMenu() },
        { label: 'Import blueprint…', onSelect: () => window.dispatchEvent(new CustomEvent('gtk:import-blueprint')) },
        { label: 'Fit to screen', onSelect: s.fitToContent },
      ];
  return <Menu label="Context menu" entries={entries} anchor={pos} onClose={() => setPos(null)} />;
}
