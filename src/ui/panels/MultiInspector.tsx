import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, Group, Lock, Sprout, Ungroup } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { kindInfo } from '../../domain/objectKinds';
import { shapeArea } from '../../domain/geometry';
import { formatArea } from '../../domain/units';
import { setObjectsProps, moveToLayer } from '../../editor/commands';
import { Field, Select } from '../components/Fields';
import { SUN_LEVELS } from '../../plants/schema';
import { SUN_LABEL } from '../../engine/suitability';
import { IRRIGATION_TYPES, SOIL_TYPES } from '../../domain/project';
import { IRRIGATION_LABELS, SOIL_LABELS } from './ObjectInspector';
import { align, distribute, groupSelection, lockSelection, ungroupSelection } from '../editor/actions';
import { t, tn } from '../../i18n';

export function MultiInspector({ ids }: { ids: string[] }) {
  const doc = useEditor((s) => s.doc)!;
  const objs = ids.map((id) => doc.objects[id]).filter(Boolean);
  const plantable = objs.filter((o) => kindInfo(o.kind).plantable);
  const area = objs.reduce((s, o) => s + shapeArea(o.shape), 0);
  const kinds = new Map<string, number>();
  for (const o of objs) kinds.set(kindInfo(o.kind).label, (kinds.get(kindInfo(o.kind).label) ?? 0) + 1);
  const same = <T,>(get: (o: (typeof objs)[number]) => T) => {
    const v = objs.map(get);
    return v.every((x) => x === v[0]) ? v[0] : undefined;
  };
  const commit = (label: string, fn: (d: typeof doc) => void) => useEditor.getState().commit(label, fn);
  const pIds = plantable.map((o) => o.id);
  return (
    <div>
      <div className="section">
        <dl className="kv">
          <dt>{t('Objects')}</dt>
          <dd>{[...kinds.entries()].map(([k, n]) => `${n} × ${k}`).join(', ')}</dd>
          {area > 0 && (
            <>
              <dt>{t('Total area')}</dt>
              <dd className="num">{formatArea(area, doc.settings.unitSystem)}</dd>
            </>
          )}
        </dl>
        {plantable.length > 0 && (
          <button className="btn primary block" onClick={() => window.dispatchEvent(new CustomEvent('gtk:add-plants', { detail: { ids: pIds } }))}>
            <Sprout size={14} /> {tn('Add the same plant to {{count}} areas', plantable.length)}
          </button>
        )}
      </div>
      <div className="section">
        <h4>{t('Arrange')}</h4>
        <div className="row wrap">
          <button className="btn sm" onClick={groupSelection}><Group size={13} />{' '}{t('Group')}</button>
          <button className="btn sm" onClick={ungroupSelection}><Ungroup size={13} />{' '}{t('Ungroup')}</button>
          <button className="btn sm" onClick={() => lockSelection(true)}><Lock size={13} />{' '}{t('Lock')}</button>
        </div>
        <div className="row" role="group" aria-label={t('Align')}>
          <button className="icon-btn sm" title={t('Align left')} aria-label={t('Align left')} onClick={() => align('left')}><AlignStartVertical size={14} /></button>
          <button className="icon-btn sm" title={t('Align centres horizontally')} aria-label={t('Align horizontal centres')} onClick={() => align('hcenter')}><AlignCenterVertical size={14} /></button>
          <button className="icon-btn sm" title={t('Align right')} aria-label={t('Align right')} onClick={() => align('right')}><AlignEndVertical size={14} /></button>
          <button className="icon-btn sm" title={t('Align top')} aria-label={t('Align top')} onClick={() => align('top')}><AlignStartHorizontal size={14} /></button>
          <button className="icon-btn sm" title={t('Align centres vertically')} aria-label={t('Align vertical centres')} onClick={() => align('vcenter')}><AlignCenterHorizontal size={14} /></button>
          <button className="icon-btn sm" title={t('Align bottom')} aria-label={t('Align bottom')} onClick={() => align('bottom')}><AlignEndHorizontal size={14} /></button>
          <button className="btn ghost sm" disabled={objs.length < 3} onClick={() => distribute('x')}>{t('Distribute ↔')}</button>
          <button className="btn ghost sm" disabled={objs.length < 3} onClick={() => distribute('y')}>↕</button>
        </div>
        <Field label={t('Layer')}>
          {(fid) => (
            <Select<string>
              id={fid}
              value={same((o) => o.layerId) ?? ''}
              emptyLabel={t('(mixed)')}
              options={doc.layers.filter((l) => l.role === 'content').map((l) => ({ value: l.id, label: l.name }))}
              onChange={(v) => v && commit('Move to layer', (d) => moveToLayer(d, ids, v))}
            />
          )}
        </Field>
      </div>
      {plantable.length > 0 && (
        <div className="section">
          <h4>{tn('Growing conditions ({{count}} areas)', plantable.length)}</h4>
          <Field label={t('Sun exposure')}>
            {(fid) => (
              <Select id={fid} value={same((o) => o.props.sunLevel ?? '') ?? ''} emptyLabel={t('(mixed / not set)')} options={SUN_LEVELS.map((l) => ({ value: l, label: SUN_LABEL[l] }))} onChange={(v) => commit('Sun exposure', (d) => setObjectsProps(d, pIds, { sunLevel: v }))} />
            )}
          </Field>
          <Field label={t('Soil')}>
            {(fid) => (
              <Select id={fid} value={same((o) => o.props.soil ?? '') ?? ''} emptyLabel={t('(mixed / not set)')} options={SOIL_TYPES.map((t) => ({ value: t, label: SOIL_LABELS[t] }))} onChange={(v) => commit('Soil', (d) => setObjectsProps(d, pIds, { soil: v }))} />
            )}
          </Field>
          <Field label={t('Irrigation')}>
            {(fid) => (
              <Select id={fid} value={same((o) => o.props.irrigation ?? '') ?? ''} emptyLabel={t('(mixed / not set)')} options={IRRIGATION_TYPES.map((t) => ({ value: t, label: IRRIGATION_LABELS[t] }))} onChange={(v) => commit('Irrigation', (d) => setObjectsProps(d, pIds, { irrigation: v }))} />
            )}
          </Field>
        </div>
      )}
    </div>
  );
}
