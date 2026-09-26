import { CheckCircle2, Circle } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { usePlantingRows } from '../../app/computed';
import { kindInfo } from '../../domain/objectKinds';
import { shapeArea } from '../../domain/geometry';
import { formatArea } from '../../domain/units';
import { sumHarvest } from '../../engine/harvest';
import { formatRange } from '../../domain/range';
import { NumberInput, Field } from '../components/Fields';
import { t, tn } from '../../i18n';

export function ProjectSummary() {
  const doc = useEditor((s) => s.doc)!;
  const rows = usePlantingRows();
  const objs = Object.values(doc.objects);
  const plantAreas = objs.filter((o) => kindInfo(o.kind).plantable && o.kind !== 'tree' && o.kind !== 'shrub');
  const growingArea = plantAreas.reduce((s, o) => s + shapeArea(o.shape), 0);
  const plants = rows.reduce((s, r) => s + (r.quantity ?? 0), 0);
  const harvest = sumHarvest(rows.map((r) => r.harvest));
  const varieties = new Set(rows.map((r) => `${r.planting.plantId}|${r.planting.variety}`)).size;
  const hasLocation = !!(doc.location.lastFrost && doc.location.firstFrost);
  const steps = [
    { done: hasLocation, label: t('Set location & frost dates'), action: () => useEditor.getState().setWorkspace('settings') },
    { done: doc.backgrounds.length > 0, label: t('Import a blueprint (optional)'), action: () => window.dispatchEvent(new CustomEvent('gtk:import-blueprint')) },
    { done: doc.backgrounds.some((b) => b.calibration), label: t('Calibrate its scale'), action: () => useEditor.getState().setTool('calibrate') },
    { done: plantAreas.length > 0, label: t('Draw beds and areas'), action: () => useEditor.getState().setTool('rect', 'bed') },
    { done: rows.length > 0, label: t('Add plants to beds'), action: () => undefined },
    { done: false, label: t('Review calendar & harvest'), action: () => useEditor.getState().setWorkspace('calendar') },
    { done: false, label: t('Export plans & care guide'), action: () => useEditor.getState().setWorkspace('reports') },
  ];
  return (
    <div>
      <div className="section">
        <h4>{doc.meta.name}</h4>
        <dl className="kv">
          <dt>{t('Objects')}</dt>
          <dd>{objs.length}</dd>
          <dt>{t('Growing area')}</dt>
          <dd className="num">{formatArea(growingArea, doc.settings.unitSystem)}</dd>
          <dt>{t('Plants ({{year}})', { year: doc.settings.activeSeason })}</dt>
          <dd className="num">{plants.toLocaleString()} · {tn('{{count}} varieties', varieties)}</dd>
          <dt>{t('Est. harvest')}</dt>
          <dd className="num">
            {harvest.total ? `${formatRange(harvest.total)} kg` : '—'}
            {harvest.excluded > 0 && <span className="muted tiny"> ({t('{{count}} without data', { count: harvest.excluded })})</span>}
          </dd>
          <dt>{t('Location')}</dt>
          <dd>
            {[doc.location.region, doc.location.country].filter(Boolean).join(', ') || <span className="muted">{t('Not set')}</span>}
            {doc.location.climateZone && <span className="muted"> · {t('zone {{zone}}', { zone: doc.location.climateZone })}</span>}
          </dd>
        </dl>
        <Field label={t('Planning season (year)')}>
          {(fid) => <NumberInput id={fid} integer value={doc.settings.activeSeason} min={1900} max={2200} onCommit={(v) => v && useEditor.getState().commit('Change season', (d) => void (d.settings.activeSeason = v))} />}
        </Field>
      </div>
      <div className="section">
        <h4>{t('Workflow')}</h4>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }} className="col">
          {steps.map((s, i) => (
            <li key={i} className="row">
              {s.done ? <CheckCircle2 size={15} color="var(--ok)" aria-label="done" /> : <Circle size={15} color="var(--muted)" aria-label={t('to do')} />}
              <button className="btn ghost sm" style={{ justifyContent: 'flex-start', flex: 1 }} onClick={s.action}>
                {i + 1}. {s.label}
              </button>
            </li>
          ))}
        </ol>
        <p className="tiny muted">{t('Tip: select several beds (Shift-click or drag a box) and use “Add plants” to plant them all at once.')}</p>
      </div>
    </div>
  );
}
