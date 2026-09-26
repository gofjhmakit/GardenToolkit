import { useMemo, useState } from 'react';
import { produce } from 'immer';
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { Dialog } from '../components/Dialog';
import { PlantBrowser } from './PlantBrowser';
import { useEditor } from '../../editor/store';
import { usePlants } from '../../app/plantStore';
import { usePlantLookup } from '../../app/lookup';
import { assignPlant, removePlantings } from '../../editor/commands';
import { computeObjectPlantings } from '../../engine/plantings';
import { checkSun } from '../../engine/suitability';
import { calculateExpectedHarvest } from '../../engine/harvest';
import { formatArea } from '../../domain/units';
import { formatRange } from '../../domain/range';
import { shapeArea } from '../../domain/geometry';
import { plantDisplayName } from '../../plants/names';
import type { Plant } from '../../plants/schema';
import { kindInfo } from '../../domain/objectKinds';
import { toast } from '../components/feedback';
import { t, tn } from '../../i18n';

export function AddPlantsDialog({ objectIds, onClose }: { objectIds: string[]; onClose: () => void }) {
  const doc = useEditor((s) => s.doc)!;
  const lookup = usePlantLookup();
  const touchRecent = usePlants((s) => s.touchRecent);
  const [selected, setSelected] = useState<string | null>(null);
  const [variety, setVariety] = useState('');
  const targets = objectIds.map((id) => doc.objects[id]).filter((o) => o && kindInfo(o.kind).plantable);
  const symbolTargets = targets.filter((o) => o.kind === 'tree' || o.kind === 'shrub');

  const preview = useMemo(() => {
    if (!selected) return [];
    const plantId = selected;
    let ids: string[] = [];
    const sim = produce(doc, (d) => {
      // Trees/shrubs hold one species: preview the replacement.
      for (const o of symbolTargets) {
        const existing = Object.values(d.plantings).filter((p) => p.objectId === o.id && p.season === d.settings.activeSeason).map((p) => p.id);
        removePlantings(d, existing);
      }
      ids = assignPlant(d, targets.map((t) => t.id), plantId);
    });
    const newIds = new Set(ids);
    return targets.map((o) => {
      const comps = computeObjectPlantings(sim, sim.objects[o.id], lookup);
      const c = comps.find((x) => newIds.has(x.planting.id));
      const plant = lookup(plantId);
      const harvest = c ? calculateExpectedHarvest({ plant, quantity: c.quantity, areaM2: c.capacity.areaMm2 / 1e6 }) : null;
      return { o, c, sun: plant ? checkSun(plant, o) : null, harvest, shared: comps.length > 1 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, doc, lookup]);

  const add = (plantId = selected) => {
    if (!plantId) return;
    const plant = lookup(plantId);
    const name = plant ? plantDisplayName(plant) : plantId;
    useEditor.getState().commit(`Add ${name}`, (d) => {
      for (const o of symbolTargets) {
        const existing = Object.values(d.plantings).filter((p) => p.objectId === o.id && p.season === d.settings.activeSeason).map((p) => p.id);
        removePlantings(d, existing);
      }
      assignPlant(d, targets.map((t) => t.id), plantId, { variety: variety.trim() });
      // Species on a tree/shrub symbol also names the symbol when it still has its default name.
      for (const o of symbolTargets) {
        const obj = d.objects[o.id];
        if (obj.name.startsWith(kindInfo(obj.kind).label)) obj.name = `${name}${variety.trim() ? ` ‘${variety.trim()}’` : ''}`;
      }
    });
    touchRecent(plantId);
    toast('ok', tn('{{name}} added to {{count}} areas', targets.length, { name }));
    onClose();
  };

  const renderSide = (plant: Plant | undefined) => {
    if (!plant) return <p className="muted">{t('Select a plant.')}</p>;
    const totalQty = preview.reduce((s, p) => s + (p.c?.quantity ?? 0), 0);
    return (
      <div className="col">
        <div>
          <h2 style={{ fontSize: 17 }}>{plantDisplayName(plant)}</h2>
          <div className="muted" style={{ fontStyle: 'italic' }}>{plant.names.scientific}</div>
        </div>
        <div className="field">
          <label htmlFor="add-variety">{t('Variety / cultivar (optional)')}</label>
          <input id="add-variety" className="input" value={variety} maxLength={200} onChange={(e) => setVariety(e.target.value)} placeholder={t('e.g. Nantes 2')} />
        </div>
        <h4>{tn('Will be added to {{count}} areas', targets.length)}</h4>
        <table className="table">
          <thead>
            <tr>
              <th>{t('Area')}</th>
              <th className="r">{t('Space')}</th>
              <th className="r">{t('Plants')}</th>
              <th>{t('Sun')}</th>
            </tr>
          </thead>
          <tbody>
            {preview.map(({ o, c, sun, shared }) => (
              <tr key={o.id}>
                <td>
                  <strong>{o.code}</strong> {o.name}
                  {shared && <div className="tiny muted">{t('shares the area ({{pct}}%)', { pct: Math.round((c?.share ?? 0) * 100) })}</div>}
                </td>
                <td className="r num">{formatArea(c?.capacity.areaMm2 ?? shapeArea(o.shape), doc.settings.unitSystem)}</td>
                <td className="r num" title={c?.capacity.explanation.join('\n')}>
                  {o.kind === 'tree' || o.kind === 'shrub' ? '1' : c?.quantity ?? '—'}
                  {c?.capacity.plantsRange && c.capacity.plantsRange.min !== c.capacity.plantsRange.max && (
                    <div className="tiny muted">{formatRange(c.capacity.plantsRange)}</div>
                  )}
                </td>
                <td>
                  {sun?.status === 'warning' ? (
                    <AlertTriangle size={14} color="var(--warn)" aria-label={sun.message} />
                  ) : sun?.status === 'ok' ? (
                    <CheckCircle2 size={14} color="var(--ok)" aria-label={sun.message} />
                  ) : (
                    <HelpCircle size={14} color="var(--muted)" aria-label={sun?.message ?? 'unknown'} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalQty > 0 && (
          <p className="small">
            {t('Total:')} <strong className="num">{totalQty.toLocaleString()}</strong> {t('plants')}
            {preview.some((p) => p.harvest?.total) && (
              <>
                {' '}· {t('est. harvest')}{' '}
                <strong className="num">
                  {formatRange(
                    preview.reduce(
                      (acc, p) => (p.harvest?.total ? { min: acc.min + p.harvest.total.min, max: acc.max + p.harvest.total.max } : acc),
                      { min: 0, max: 0 },
                    ),
                  )}{' '}
                  kg
                </strong>
              </>
            )}
          </p>
        )}
        {preview.some((p) => p.sun?.status === 'warning') && (
          <div className="callout warn">
            <AlertTriangle size={14} />
            <span>{preview.find((p) => p.sun?.status === 'warning')!.sun!.message}</span>
          </div>
        )}
        {preview.some((p) => p.c && p.c.capacity.plants == null && p.o.kind !== 'tree' && p.o.kind !== 'shrub') && (
          <div className="callout">
            <HelpCircle size={14} />
            <span>{t('This plant has no spacing data, so the quantity can’t be calculated. You can enter spacing or a quantity after adding it.')}</span>
          </div>
        )}
        <p className="tiny muted">{t('Quantities use the preferred (mid-range) spacing laid out on each area’s real shape. You can override spacing or quantity afterwards; your values are kept. Nothing in the global plant database is changed.')}</p>
        <button className="btn primary" onClick={() => add()}>
          {tn('Add {{name}} to {{count}} areas', targets.length, { name: plantDisplayName(plant) })}
        </button>
      </div>
    );
  };

  return (
    <Dialog open wide title={targets.length === 1 ? t('Add plants to {{code}} {{name}}', { code: targets[0]?.code, name: targets[0]?.name }) : t('Add a plant to {{count}} areas', { count: targets.length })} onClose={onClose}>
      <div style={{ height: '100%', margin: -16 }}>
        <PlantBrowser selectedId={selected} onSelect={setSelected} onActivate={(id) => add(id)} renderSide={renderSide} autoFocus />
      </div>
    </Dialog>
  );
}
