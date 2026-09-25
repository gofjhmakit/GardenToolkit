import { useMemo } from 'react';
import { useEditor } from '../../editor/store';
import { usePlantingRows } from '../../app/computed';
import { usePlantLookup } from '../../app/lookup';
import { generatePlantingCalendar } from '../../engine/calendar';
import { sumHarvest } from '../../engine/harvest';
import { formatRange, type Range } from '../../domain/range';
import { formatDateRange, MONTH_NAMES, parseIso } from '../../lib/dates';
import { plantDisplayName } from '../../plants/names';
import { Stat } from './PlantingsView';
import { ConfidenceBadge } from '../panels/PlantingCard';
import { plantColor } from '../plantColors';

export function HarvestView() {
  const doc = useEditor((s) => s.doc)!;
  const rows = usePlantingRows();
  const lookup = usePlantLookup();
  const cal = useMemo(() => generatePlantingCalendar(doc, lookup), [doc, lookup]);
  const total = sumHarvest(rows.map((r) => r.harvest));
  const byPlant = new Map<string, { name: string; qty: number; qtyUnknown: boolean; total: Range | null; excluded: number; windows: { start: string; end: string | null }[]; areas: string[]; confidence: string; color: string; assumptions: string[] }>();
  for (const r of rows) {
    const key = `${r.planting.plantId}|${r.planting.variety}`;
    const name = (r.plant ? plantDisplayName(r.plant) : r.planting.plantId) + (r.planting.variety ? ` ‘${r.planting.variety}’` : '');
    const e = byPlant.get(key) ?? { name, qty: 0, qtyUnknown: false, total: null, excluded: 0, windows: [], areas: [], confidence: r.harvest.confidence, color: plantColor(r.planting.plantId, r.plant?.category), assumptions: [] };
    e.qty += r.quantity ?? 0;
    e.qtyUnknown ||= r.quantity == null;
    if (r.harvest.total) e.total = e.total ? { min: e.total.min + r.harvest.total.min, max: e.total.max + r.harvest.total.max } : r.harvest.total;
    else e.excluded++;
    e.areas.push(r.host.code);
    e.assumptions.push(...r.harvest.assumptions);
    const h = cal.events.find((x) => x.plantingId === r.planting.id && x.type === 'harvest');
    if (h) e.windows.push({ start: h.start, end: h.end });
    byPlant.set(key, e);
  }
  const yStart = Date.UTC(doc.settings.activeSeason, 0, 1);
  const yEnd = Date.UTC(doc.settings.activeSeason + 1, 0, 1);
  const pos = (iso: string) => Math.max(0, Math.min(1, (parseIso(iso) - yStart) / (yEnd - yStart)));
  const list = [...byPlant.values()].sort((a, b) => (b.total?.max ?? -1) - (a.total?.max ?? -1));
  return (
    <div className="view-inner">
      <div className="view-header">
        <div>
          <h1>Harvest plan {doc.settings.activeSeason}</h1>
          <p className="muted">Estimated ranges based on plant yield data and your quantities. Crops without reliable yield data are listed but not totalled.</p>
        </div>
      </div>
      <div className="stat-grid">
        <Stat label="Estimated total harvest" value={total.total ? `${formatRange(total.total)} kg` : '—'} sub="a range, not a guarantee" />
        <Stat label="Crops with yield data" value={String(total.included)} />
        <Stat label="Without yield data" value={String(total.excluded)} sub="excluded from the total" />
      </div>
      {list.length === 0 ? (
        <div className="empty-state">No plantings yet.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th>Crop</th>
                <th>Areas</th>
                <th className="r">Plants</th>
                <th className="r">Estimated yield</th>
                <th style={{ width: '38%' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
                    {MONTH_NAMES.map((m) => (
                      <span key={m}>{m[0]}</span>
                    ))}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.name}>
                  <td>
                    <strong>{p.name}</strong>
                    {p.total && <div><ConfidenceBadge c={p.confidence} /></div>}
                  </td>
                  <td>{p.areas.join(', ')}</td>
                  <td className="r num">{p.qty.toLocaleString()}{p.qtyUnknown ? '+' : ''}</td>
                  <td className="r num" title={[...new Set(p.assumptions)].join('\n')}>
                    {p.total ? `${formatRange(p.total, p.total.max < 10 ? 1 : 0)} kg` : <span className="muted tiny">Yield estimate unavailable</span>}
                    {p.total && p.excluded > 0 && <div className="tiny muted">{p.excluded} planting(s) without data</div>}
                  </td>
                  <td>
                    <div className="timeline" title={p.windows.map((w) => formatDateRange(w.start, w.end)).join('; ')}>
                      {p.windows.map((w, i) => {
                        const a = pos(w.start);
                        const b = pos(w.end ?? w.start);
                        return <span key={i} className="bar" style={{ left: `${a * 100}%`, width: `max(4px, ${(b - a) * 100}%)`, background: p.color }} />;
                      })}
                    </div>
                    <div className="tiny muted">{p.windows.map((w) => formatDateRange(w.start, w.end)).join('; ') || 'No harvest window data'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="small muted">
        To record your own expectations, open a planting in the Design inspector (Variety, dates, yield & notes) and set “Your expected yield”. Harvest logging (actual vs. estimated) is planned; the data model keeps estimates and overrides separate to make that possible.
      </p>
    </div>
  );
}
