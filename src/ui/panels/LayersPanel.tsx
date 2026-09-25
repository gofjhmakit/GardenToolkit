import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, Image as ImageIcon, Lock, LockOpen, Plus, Trash2, Pencil, Group } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { kindInfo } from '../../domain/objectKinds';
import { addLayer, deleteLayer, moveLayer, updateLayer, updateBackground } from '../../editor/commands';
import { promptAsync, confirmAsync } from '../components/feedback';

export function LayersPanel() {
  const { t } = useTranslation();
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
    <aside className="side" aria-label="Layers and objects">
      <div className="side-header">
        <h2>{t('Layers')}</h2>
        <span className="spacer" />
        <button
          className="icon-btn sm"
          title="Add layer"
          aria-label="Add layer"
          onClick={async () => {
            const name = await promptAsync({ title: 'New layer', label: 'Layer name', value: 'New layer', confirmLabel: 'Add layer' });
            if (name) s().commit('Add layer', (d) => void addLayer(d, name));
          }}
        >
          <Plus size={14} />
        </button>
      </div>
      <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
        <input className="input sm" placeholder="Filter objects…" aria-label="Filter objects" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <div className="side-body">
        <ul className="tree" role="tree" aria-label="Layers">
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
                  <button className="icon-btn sm" aria-label={open ? `Collapse ${layer.name}` : `Expand ${layer.name}`} onClick={() => setCollapsed({ ...collapsed, [layer.id]: open })}>
                    {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                  <span className={`label ${layer.visible ? '' : 'dimmed'}`} onDoubleClick={async () => {
                    const name = await promptAsync({ title: 'Rename layer', label: 'Layer name', value: layer.name, confirmLabel: 'Rename' });
                    if (name) s().commit('Rename layer', (d) => updateLayer(d, layer.id, { name }));
                  }}>
                    {layer.name} <span className="muted tiny">({count})</span>
                  </span>
                  <span className="row-actions">
                    {!isBg && (
                      <>
                        <button className="icon-btn sm" title="Move layer up" aria-label={`Move ${layer.name} up`} disabled={idx === 0} onClick={() => s().commit('Move layer', (d) => moveLayer(d, layer.id, 'up'))}>
                          <ChevronUp size={13} />
                        </button>
                        <button className="icon-btn sm" title="Move layer down" aria-label={`Move ${layer.name} down`} disabled={idx >= layersTopFirst.length - 2} onClick={() => s().commit('Move layer', (d) => moveLayer(d, layer.id, 'down'))}>
                          <ChevronDown size={13} />
                        </button>
                      </>
                    )}
                    <button
                      className="icon-btn sm"
                      title={layer.visible ? 'Hide layer' : 'Show layer'}
                      aria-label={`${layer.visible ? 'Hide' : 'Show'} layer ${layer.name}`}
                      aria-pressed={!layer.visible}
                      onClick={() => s().commit(layer.visible ? 'Hide layer' : 'Show layer', (d) => updateLayer(d, layer.id, { visible: !layer.visible }))}
                    >
                      {layer.visible ? <Eye size={13} /> : <EyeOff size={13} className="active-flag" />}
                    </button>
                    <button
                      className="icon-btn sm"
                      title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                      aria-label={`${layer.locked ? 'Unlock' : 'Lock'} layer ${layer.name}`}
                      aria-pressed={layer.locked}
                      onClick={() => s().commit(layer.locked ? 'Unlock layer' : 'Lock layer', (d) => updateLayer(d, layer.id, { locked: !layer.locked }))}
                    >
                      {layer.locked ? <Lock size={13} className="active-flag" /> : <LockOpen size={13} />}
                    </button>
                    {!isBg && (
                      <>
                        <button className="icon-btn sm" title="Rename layer" aria-label={`Rename layer ${layer.name}`} onClick={async () => {
                          const name = await promptAsync({ title: 'Rename layer', label: 'Layer name', value: layer.name, confirmLabel: 'Rename' });
                          if (name) s().commit('Rename layer', (d) => updateLayer(d, layer.id, { name }));
                        }}>
                          <Pencil size={12} />
                        </button>
                        <button className="icon-btn sm" title="Delete layer (objects move to another layer)" aria-label={`Delete layer ${layer.name}`} onClick={async () => {
                          const ok = await confirmAsync({ title: 'Delete layer?', message: `Delete "${layer.name}"? Its ${layer.objectIds.length} object(s) will be moved to another layer.`, confirmLabel: 'Delete layer', danger: true });
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
                            <button className="label" style={{ border: 0, background: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }} onClick={() => s().selectBackground(bg.id)}>
                              <span className={bg.visible ? '' : 'dimmed'}>{bg.name}</span>
                              {!bg.calibration && <span className="badge warn" style={{ marginLeft: 6 }}>uncalibrated</span>}
                            </button>
                            <span className="row-actions">
                              <button className="icon-btn sm" aria-label={bg.visible ? 'Hide image' : 'Show image'} onClick={() => s().commit('Toggle blueprint', (d) => updateBackground(d, bg.id, { visible: !bg.visible }))}>
                                {bg.visible ? <Eye size={13} /> : <EyeOff size={13} className="active-flag" />}
                              </button>
                              <button className="icon-btn sm" aria-label={bg.locked ? 'Unlock image' : 'Lock image'} onClick={() => s().commit(bg.locked ? 'Unlock blueprint' : 'Lock blueprint', (d) => updateBackground(d, bg.id, { locked: !bg.locked }))}>
                                {bg.locked ? <Lock size={13} className="active-flag" /> : <LockOpen size={13} />}
                              </button>
                            </span>
                          </div>
                        </li>
                      ))}
                    {isBg && doc.backgrounds.length === 0 && (
                      <li className="muted tiny" style={{ padding: '4px 28px' }}>
                        No blueprint imported
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
                              style={{ border: 0, background: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                              title={`${info.label}${o.locked ? ' (locked)' : ''}`}
                              onClick={(e) => s().setSelection([o.id], e.shiftKey || e.ctrlKey || e.metaKey ? 'toggle' : 'replace')}
                              onDoubleClick={() => s().zoomToSelection()}
                            >
                              <span className={o.hidden ? 'dimmed' : ''}>{o.name || info.label}</span>
                            </button>
                            {o.groupId && <Group size={11} aria-label="grouped" className="muted" />}
                            <span className="code">{o.code}</span>
                            <span className="row-actions">
                              <button className="icon-btn sm" aria-label={o.hidden ? `Show ${o.name}` : `Hide ${o.name}`} onClick={() => s().commit(o.hidden ? 'Show' : 'Hide', (d) => void (d.objects[o.id].hidden = !o.hidden))}>
                                {o.hidden ? <EyeOff size={13} className="active-flag" /> : <Eye size={13} />}
                              </button>
                              <button className="icon-btn sm" aria-label={o.locked ? `Unlock ${o.name}` : `Lock ${o.name}`} onClick={() => s().commit(o.locked ? 'Unlock' : 'Lock', (d) => void (d.objects[o.id].locked = !o.locked))}>
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
