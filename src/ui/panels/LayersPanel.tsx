import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, Image as ImageIcon, Lock, LockOpen, Plus, Trash2, Pencil, Group } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { kindInfo } from '../../domain/objectKinds';
import { addLayer, deleteLayer, moveLayer, updateLayer, updateBackground } from '../../editor/commands';
import { promptAsync, confirmAsync } from '../components/feedback';
import { t, tn } from '../../i18n';

export function LayersPanel() {
  const doc = useEditor((s) => s.doc)!;
  const selection = useEditor((s) => s.selection);
  const selectedBg = useEditor((s) => s.selectedBackgroundId);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');
  const sel = new Set(selection);
  const s = useEditor.getState;
  const layersTopFirst = [...doc.layers].reverse();
  const q = filter.trim().toLowerCase();

  return (
    <aside className="side" aria-label={t('Layers and objects')}>
      <div className="side-header">
        <h2>{t('Layers')}</h2>
        <span className="spacer" />
        <button
          className="icon-btn sm"
          title={t('Add layer')}
          aria-label={t('Add layer')}
          onClick={async () => {
            const name = await promptAsync({ title: t('New layer'), label: t('Layer name'), value: 'New layer', confirmLabel: t('Add layer'), maxLength: 100 });
            if (name) s().commit('Add layer', (d) => void addLayer(d, name));
          }}
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="side-toolbar">
        <label className="search-field">
          <Search size={13} aria-hidden="true" />
          <input className="input sm" placeholder={t('Filter objects…')} aria-label={t('Filter objects')} value={filter} onChange={(e) => setFilter(e.target.value)} />
        </label>
      </div>
      <div className="side-body">
        <ul className="tree" role="tree" aria-label={t('Layers')}>
          {layersTopFirst.map((layer, idx) => {
            const isBg = layer.role === 'background';
            const open = !collapsed[layer.id];
            const objects = [...layer.objectIds]
              .reverse()
              .map((id) => doc.objects[id])
              .filter(Boolean)
              .filter((o) => !q || o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q) || kindInfo(o.kind).label.toLowerCase().includes(q));
            const count = isBg ? doc.backgrounds.length : layer.objectIds.length;
            if (q && !isBg && objects.length === 0) return null;
            return (
              <li key={layer.id} className="tree-layer" role="treeitem" aria-expanded={open} aria-selected={false}>
                <div className="tree-row">
                  <button className="icon-btn sm" aria-label={open ? t('Collapse {{name}}', { name: layer.name }) : t('Expand {{name}}', { name: layer.name })} onClick={() => setCollapsed({ ...collapsed, [layer.id]: open })}>
                    {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                  <span className={`label ${layer.visible ? '' : 'dimmed'}`} onDoubleClick={async () => {
                    const name = await promptAsync({ title: t('Rename layer'), label: t('Layer name'), value: layer.name, confirmLabel: t('Rename'), maxLength: 100 });
                    if (name) s().commit('Rename layer', (d) => updateLayer(d, layer.id, { name }));
                  }}>
                    {layer.name} <span className="code">{count}</span>
                  </span>
                  <span className="row-actions">
                    {!isBg && (
                      <>
                        <button className="icon-btn sm" title={t('Move layer up')} aria-label={t('Move {{name}} up', { name: layer.name })} disabled={idx === 0} onClick={() => s().commit('Move layer', (d) => moveLayer(d, layer.id, 'up'))}>
                          <ChevronUp size={13} />
                        </button>
                        <button className="icon-btn sm" title={t('Move layer down')} aria-label={t('Move {{name}} down', { name: layer.name })} disabled={idx >= layersTopFirst.length - 2} onClick={() => s().commit('Move layer', (d) => moveLayer(d, layer.id, 'down'))}>
                          <ChevronDown size={13} />
                        </button>
                      </>
                    )}
                    <button
                      className="icon-btn sm"
                      title={layer.visible ? t('Hide layer') : t('Show layer')}
                      aria-label={layer.visible ? t('Hide layer {{name}}', { name: layer.name }) : t('Show layer {{name}}', { name: layer.name })}
                      aria-pressed={!layer.visible}
                      onClick={() => s().commit(layer.visible ? 'Hide layer' : 'Show layer', (d) => updateLayer(d, layer.id, { visible: !layer.visible }))}
                    >
                      {layer.visible ? <Eye size={13} /> : <EyeOff size={13} className="active-flag" />}
                    </button>
                    <button
                      className="icon-btn sm"
                      title={layer.locked ? t('Unlock layer') : t('Lock layer')}
                      aria-label={layer.locked ? t('Unlock layer {{name}}', { name: layer.name }) : t('Lock layer {{name}}', { name: layer.name })}
                      aria-pressed={layer.locked}
                      onClick={() => s().commit(layer.locked ? 'Unlock layer' : 'Lock layer', (d) => updateLayer(d, layer.id, { locked: !layer.locked }))}
                    >
                      {layer.locked ? <Lock size={13} className="active-flag" /> : <LockOpen size={13} />}
                    </button>
                    {!isBg && (
                      <>
                        <button className="icon-btn sm" title={t('Rename layer')} aria-label={t('Rename layer {{name}}', { name: layer.name })} onClick={async () => {
                          const name = await promptAsync({ title: t('Rename layer'), label: t('Layer name'), value: layer.name, confirmLabel: t('Rename'), maxLength: 100 });
                          if (name) s().commit('Rename layer', (d) => updateLayer(d, layer.id, { name }));
                        }}>
                          <Pencil size={12} />
                        </button>
                        <button className="icon-btn sm" title={t('Delete layer (objects move to another layer)')} aria-label={t('Delete layer {{name}}', { name: layer.name })} onClick={async () => {
                          const ok = await confirmAsync({ title: t('Delete layer?'), message: tn('Delete "{{name}}"? Its {{count}} objects will be moved to another layer.', layer.objectIds.length, { name: layer.name }), confirmLabel: t('Delete layer'), danger: true });
                          if (ok) s().commit('Delete layer', (d) => void deleteLayer(d, layer.id));
                        }}>
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </span>
                </div>
                {open && (
                  <ul className="tree" role="group">
                    {isBg &&
                      doc.backgrounds.map((bg) => (
                        <li key={bg.id} role="treeitem" aria-selected={selectedBg === bg.id}>
                          <div className={`tree-row ${selectedBg === bg.id ? 'selected' : ''}`} style={{ paddingLeft: 28 }}>
                            <ImageIcon size={13} />
                            <button className="label" onClick={() => s().selectBackground(bg.id)}>
                              <span className={bg.visible ? '' : 'dimmed'}>{bg.name}</span>
                              {!bg.calibration && <span className="badge warn" style={{ marginLeft: 6 }}>uncalibrated</span>}
                            </button>
                            <span className="row-actions">
                              <button className="icon-btn sm" aria-pressed={!bg.visible} aria-label={bg.visible ? t('Hide image') : t('Show image')} onClick={() => s().commit('Toggle blueprint', (d) => updateBackground(d, bg.id, { visible: !bg.visible }))}>
                                {bg.visible ? <Eye size={13} /> : <EyeOff size={13} className="active-flag" />}
                              </button>
                              <button className="icon-btn sm" aria-pressed={bg.locked} aria-label={bg.locked ? t('Unlock image') : t('Lock image')} onClick={() => s().commit(bg.locked ? 'Unlock blueprint' : 'Lock blueprint', (d) => updateBackground(d, bg.id, { locked: !bg.locked }))}>
                                {bg.locked ? <Lock size={13} className="active-flag" /> : <LockOpen size={13} />}
                              </button>
                            </span>
                          </div>
                        </li>
                      ))}
                    {isBg && doc.backgrounds.length === 0 && (
                      <li className="muted tiny" role="treeitem" aria-disabled="true" aria-selected={false} style={{ padding: '4px 28px' }}>
                        {t('No blueprint imported')}
                      </li>
                    )}
                    {objects.map((o) => {
                      const info = kindInfo(o.kind);
                      const selected = sel.has(o.id);
                      return (
                        <li key={o.id} role="treeitem" aria-selected={selected}>
                          <div className={`tree-row ${selected ? 'selected' : ''}`} style={{ paddingLeft: 28 }}>
                            <span className="swatch" style={{ background: o.style.fill ?? (info.fill === 'none' ? info.stroke : info.fill) }} aria-hidden="true" />
                            <button
                              className="label"
                              title={`${info.label}${o.locked ? ' (locked)' : ''}`}
                              onClick={(e) => s().setSelection([o.id], e.shiftKey || e.ctrlKey || e.metaKey ? 'toggle' : 'replace')}
                              onDoubleClick={() => s().zoomToSelection()}
                            >
                              <span className={o.hidden ? 'dimmed' : ''}>{o.name || info.label}</span>
                            </button>
                            {o.groupId && <Group size={11} aria-label="grouped" className="muted" />}
                            <span className="code">{o.code}</span>
                            <span className="row-actions">
                              <button className="icon-btn sm" aria-pressed={o.hidden} aria-label={o.hidden ? `Show ${o.name}` : `Hide ${o.name}`} onClick={() => s().commit(o.hidden ? 'Show' : 'Hide', (d) => void (d.objects[o.id].hidden = !o.hidden))}>
                                {o.hidden ? <EyeOff size={13} className="active-flag" /> : <Eye size={13} />}
                              </button>
                              <button className="icon-btn sm" aria-pressed={o.locked} aria-label={o.locked ? `Unlock ${o.name}` : `Lock ${o.name}`} onClick={() => s().commit(o.locked ? 'Unlock' : 'Lock', (d) => void (d.objects[o.id].locked = !o.locked))}>
                                {o.locked ? <Lock size={13} className="active-flag" /> : <LockOpen size={13} />}
                              </button>
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
