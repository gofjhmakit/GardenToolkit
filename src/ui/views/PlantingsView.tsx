import { useMemo, useState } from 'react';
import { Download, Sprout } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { usePlantingRows } from '../../app/computed';
import { usePlantLookup } from '../../app/lookup';
import { formatRange } from '../../domain/range';
import { formatArea } from '../../domain/units';
import { plantDisplayName } from '../../plants/names';
import { updatePlanting } from '../../editor/commands';
import { NumberInput } from '../components/Fields';
import { gardenStats } from '../../reports/builders';
import { plantingsCsv } from '../../reports/csv';
import { downloadText, safeFileName } from '../../lib/download';
import { METHOD_LABELS, ConfidenceBadge } from '../panels/PlantingCard';
import { plantColor } from '../plantColors';

export function PlantingsView() {
  const doc = useEditor((s) => s.doc)!;
  const rows = usePlantingRows();
  const lookup = usePlantLookup();
  const [q, setQ] = useState('');
  const stats = useMemo(() => gardenStats(doc, rows), [doc, rows]);
  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = `${r.host.code} ${r.host.name} ${r.plant ? plantDisplayName(r.plant) : ''} ${r.plant?.names.scientific ?? ''} ${r.planting.variety}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });
  const units = doc.settings.unitSystem;
  return (
    <div className="view-inner">
      <div className="view-header">
        <div>
          <h1>Plantings {doc.settings.activeSeason}</h1>
          <p className="muted">Every plant in every area, with calculated and overridden quantities.</p>
        </div>
        <span className="spacer" />
        <input className="input" style={{ width: 220 }} placeholder="Filter…" aria-label="Filter plantings" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" onClick={() => downloadText(plantingsCsv(doc, lookup), `${safeFileName(doc.meta.name)}-plantings.csv`, 'text/csv')}>
          <Download size={14} /> CSV
        </button>
      </div>
      <div className="stat-grid">
        <Stat label="Planting area" value={formatArea(stats.plantingAreaM2 * 1e6, units)} />
        <Stat label="Vegetable & herb area" value={formatArea(stats.vegetableAreaM2 * 1e6, units)} />
        <Stat label="Plants" value={stats.plantCount.toLocaleString()} sub={stats.plantCountComplete ? undefined : 'some quantities unknown'} />
        <Stat label="Varieties" value={String(stats.varieties)} />
        <Stat label="Estimated harvest" value={stats.harvest.total ? `${formatRange(stats.harvest.total)} kg` : '—'} sub={stats.harvest.excluded ? `${stats.harvest.excluded} crop(s) without yield data` : 'range, not a guarantee'} />
      </div>
      {rows.length === 0 ? (
        <div className="empty-state">
          <Sprout size={28} />
          <p>No plants yet. In the Design tab, select one or more beds and click “Add plants”.</p>
          <button className="btn primary" onClick={() => useEditor.getState().setWorkspace('design')}>Go to design</button>
        </div>
      ) : (
        <div className="card flush">
          <table className="table">
            <thead>
              <tr>
                <th>Area</th>
                <th>Plant</th>
                <th>Method</th>
                <th className="r">Area</th>
                <th className="r">Calculated</th>
                <th className="r" style={{ width: 110 }}>Your quantity</th>
                <th className="r">Seed</th>
                <th className="r">Est. harvest</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.planting.id}>
                  <td>
                    <button className="btn ghost sm" onClick={() => {
                      useEditor.getState().setWorkspace('design');
                      useEditor.getState().setSelection([r.host.id]);
                      requestAnimationFrame(() => useEditor.getState().zoomToSelection());
                    }}>
                      <strong>{r.host.code}</strong>&nbsp;{r.host.name}
                    </button>
                  </td>
                  <td>
                    <span className="swatch" style={{ display: 'inline-block', background: plantColor(r.planting.plantId, r.plant?.category), marginRight: 6, verticalAlign: -1 }} />
                    {r.plant ? plantDisplayName(r.plant) : r.planting.plantId}
                    {r.planting.variety && <span className="muted"> ‘{r.planting.variety}’</span>}
                    <div className="tiny muted" style={{ fontStyle: 'italic' }}>{r.plant?.names.scientific}</div>
                  </td>
                  <td>{METHOD_LABELS[r.rules.method]}</td>
                  <td className="r num">{formatArea(r.capacity.areaMm2, units)}</td>
                  <td className="r num" title={r.capacity.explanation.join('\n')}>
                    {r.capacity.plants ?? '—'}
                    {r.capacity.plantsRange && r.capacity.plantsRange.min !== r.capacity.plantsRange.max && <div className="tiny muted">{formatRange(r.capacity.plantsRange)}</div>}
                  </td>
                  <td className="r">
                    <NumberInput
                      ariaLabel={`Your quantity for ${r.plant ? plantDisplayName(r.plant) : r.planting.plantId} in ${r.host.code}`}
                      value={r.planting.quantityOverride}
                      integer
                      min={0}
                      allowEmpty
                      placeholder={r.capacity.plants != null ? String(r.capacity.plants) : ''}
                      onCommit={(v) => useEditor.getState().commit('Set quantity', (d) => updatePlanting(d, r.planting.id, { quantityOverride: v }))}
                    />
                  </td>
                  <td className="r num">{r.capacity.seeds ? formatRange(r.capacity.seeds) : r.capacity.seedGrams ? `${formatRange(r.capacity.seedGrams, 1)} g` : '—'}</td>
                  <td className="r num">
                    {r.harvest.total ? (
                      <>
                        {formatRange(r.harvest.total, 1)} kg
                        <div><ConfidenceBadge c={r.harvest.confidence} /></div>
                      </>
                    ) : (
                      <span className="muted tiny">unavailable</span>
                    )}
                  </td>
                  <td>{r.planting.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
