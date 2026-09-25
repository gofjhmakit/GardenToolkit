import { AlertTriangle, CheckCircle2, HelpCircle, X } from 'lucide-react';
import { useEditor } from '../../editor/store';
import type { PlantingComputation } from '../../engine/plantings';
import { calculateExpectedHarvest } from '../../engine/harvest';
import { checkSuitability } from '../../engine/suitability';
import { formatRange } from '../../domain/range';
import { formatArea, formatLength, inputUnit } from '../../domain/units';
import { removePlantings, updatePlanting } from '../../editor/commands';
import { PLANTING_METHODS, type PlantingMethod } from '../../plants/schema';
import type { Planting } from '../../domain/project';
import { plantDisplayName } from '../../plants/names';
import { plantColor } from '../plantColors';
import { Field, LengthInput, NumberInput, Select, TextInput } from '../components/Fields';

export const METHOD_LABELS: Record<PlantingMethod, string> = {
  individual: 'Individual plants',
  spaced: 'Spaced plants (rows)',
  rows: 'Row sowing',
  grid: 'Grid / intensive',
  broadcast: 'Broadcast / area',
};

const STATUS_LABELS: Record<Planting['status'], string> = {
  planned: 'Planned',
  sown: 'Sown',
  planted: 'Planted',
  growing: 'Growing',
  harvested: 'Harvested',
  removed: 'Removed',
};

export function ConfidenceBadge({ c }: { c: string }) {
  const cls = c === 'high' ? 'ok' : c === 'medium' ? 'accent' : c === 'low' ? 'warn' : '';
  return <span className={`badge ${cls} conf`} title="Data confidence">{c === 'unknown' ? 'confidence unknown' : `${c} confidence`}</span>;
}

export function PlantingCard({ comp, siblings }: { comp: PlantingComputation; siblings: number }) {
  const doc = useEditor((s) => s.doc)!;
  const { planting, plant, capacity, host } = comp;
  const id = planting.id;
  const units = doc.settings.unitSystem;
  const small = inputUnit(units, 'small');
  const commit = (label: string, patch: Partial<Omit<Planting, 'id'>>, key?: string) =>
    useEditor.getState().commit(label, (d) => updatePlanting(d, id, patch), key ? { coalesceKey: `${key}:${id}` } : undefined);
  const name = plant ? plantDisplayName(plant) : planting.plantId;
  const color = plantColor(planting.plantId, plant?.category);
  const areaM2 = capacity.areaMm2 / 1e6;
  const harvest = calculateExpectedHarvest({ plant, quantity: comp.quantity, areaM2, override: planting.yieldOverride });
  const issues = plant ? checkSuitability(plant, host, doc.location) : [];
  const single = host.kind === 'tree' || host.kind === 'shrub';
  const method = comp.rules.method;

  return (
    <div className="card col" style={{ padding: 10, gap: 8, borderLeft: `3px solid ${color}` }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 650 }}>
            {name}
            {planting.variety ? <span className="muted"> ‘{planting.variety}’</span> : null}
          </div>
          {plant && <div className="small muted" style={{ fontStyle: 'italic' }}>{plant.names.scientific}</div>}
        </div>
        <button className="icon-btn sm" aria-label={`Remove ${name}`} title="Remove from this area" onClick={() => useEditor.getState().commit('Remove planting', (d) => removePlantings(d, [id]))}>
          <X size={14} />
        </button>
      </div>

      {!single && (
        <div className="callout ok" style={{ background: 'var(--accent-soft)' }}>
          <div style={{ flex: 1 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                <strong className="num" style={{ fontSize: 16 }}>{comp.quantity ?? '—'}</strong> plants
                {comp.quantitySource === 'override' && <span className="badge accent" style={{ marginLeft: 6 }}>your value</span>}
              </span>
              <span className="small muted num">{formatArea(capacity.areaMm2, units)}</span>
            </div>
            <div className="small">
              {capacity.plants != null ? (
                <>
                  Calculated: <strong className="num">{capacity.plants}</strong>
                  {capacity.plantsRange && capacity.plantsRange.min !== capacity.plantsRange.max && <span className="muted"> (range {formatRange(capacity.plantsRange)})</span>}
                  {capacity.rows ? <span className="muted"> · {capacity.rows} rows</span> : null}
                </>
              ) : (
                <span className="muted">Not calculable — {capacity.warnings[0] ?? 'missing data'}</span>
              )}
            </div>
            {capacity.seeds && (
              <div className="small">
                Seed: <span className="num">{formatRange(capacity.seeds)}</span> seeds
                {capacity.seedGrams && <span className="muted num"> (≈{formatRange(capacity.seedGrams, 1)} g)</span>}
              </div>
            )}
            {!capacity.seeds && capacity.seedGrams && <div className="small">Seed: ≈{formatRange(capacity.seedGrams, 1)} g</div>}
          </div>
        </div>
      )}

      {!single && (
        <div className="grid2">
          <Field label="Your quantity" hint={planting.quantityOverride != null ? 'Override is kept even if the bed changes' : 'Leave empty to use the calculation'}>
            {(fid) => (
              <NumberInput id={fid} value={planting.quantityOverride} integer min={0} allowEmpty placeholder={capacity.plants != null ? String(capacity.plants) : ''} onCommit={(v) => commit('Set quantity', { quantityOverride: v })} />
            )}
          </Field>
          <Field label="Method">
            {(fid) => (
              <Select<PlantingMethod>
                id={fid}
                value={planting.method ?? ''}
                emptyLabel={`Default (${METHOD_LABELS[method]})`}
                options={PLANTING_METHODS.map((m) => ({ value: m, label: METHOD_LABELS[m] }))}
                onChange={(v) => commit('Planting method', { method: v })}
              />
            )}
          </Field>
          <Field label={method === 'grid' || method === 'individual' ? 'Plant spacing' : 'In-row spacing'} hint={comp.rules.inRowMm ? `Data: ${formatRange({ min: comp.rules.inRowMm.min / 10, max: comp.rules.inRowMm.max / 10 })} cm` : 'No data — enter a value'}>
            {(fid) => <LengthInput id={fid} unit={small} valueMm={planting.spacing.inRowMm} allowEmpty min={5} placeholder={capacity.inRowMm ? String(Math.round(capacity.inRowMm / 10)) : ''} onCommit={(v) => commit('Spacing', { spacing: { inRowMm: v } })} />}
          </Field>
          {method !== 'grid' && method !== 'individual' && method !== 'broadcast' ? (
            <Field label="Row spacing" hint={comp.rules.rowMm ? `Data: ${formatRange({ min: comp.rules.rowMm.min / 10, max: comp.rules.rowMm.max / 10 })} cm` : undefined}>
              {(fid) => <LengthInput id={fid} unit={small} valueMm={planting.spacing.rowMm} allowEmpty min={5} placeholder={capacity.rowMm ? String(Math.round(capacity.rowMm / 10)) : ''} onCommit={(v) => commit('Row spacing', { spacing: { rowMm: v } })} />}
            </Field>
          ) : (
            <Field label="Pattern">
              {(fid) => (
                <Select<'square' | 'triangular'>
                  id={fid}
                  value={planting.spacing.pattern ?? 'square'}
                  options={[
                    { value: 'square', label: 'Square grid' },
                    { value: 'triangular', label: 'Offset (triangular)' },
                  ]}
                  onChange={(v) => commit('Pattern', { spacing: { pattern: v ?? 'square' } })}
                />
              )}
            </Field>
          )}
          {siblings > 1 && (
            <Field label="Share of area" hint={`Currently ${Math.round(comp.share * 100)}%`}>
              {(fid) => (
                <NumberInput id={fid} value={planting.areaShare != null ? Math.round(planting.areaShare * 1000) / 10 : null} min={0} max={100} digits={1} suffix="%" allowEmpty placeholder={String(Math.round(comp.share * 100))} onCommit={(v) => commit('Area share', { areaShare: v == null ? null : v / 100 })} />
              )}
            </Field>
          )}
          <Field label="Edge margin" hint="Default: half the spacing">
            {(fid) => <LengthInput id={fid} unit={small} valueMm={planting.spacing.edgeMarginMm} allowEmpty onCommit={(v) => commit('Edge margin', { spacing: { edgeMarginMm: v } })} />}
          </Field>
        </div>
      )}

      <div className="small">
        <strong>Harvest: </strong>
        {harvest.total ? (
          <>
            <span className="num">{formatRange(harvest.total, harvest.total.max < 10 ? 1 : 0)} kg</span> <ConfidenceBadge c={harvest.confidence} />
            <div className="muted tiny">{harvest.assumptions.join(' ')} Estimates are not guarantees.</div>
          </>
        ) : (
          <span className="muted">{harvest.unavailableReason}</span>
        )}
      </div>

      {issues.filter((i) => i.status !== 'ok' || i.check === 'sun').map((i, k) => (
        <div key={k} className={`callout ${i.status === 'warning' ? 'warn' : i.status === 'ok' ? 'ok' : ''}`} style={{ padding: '5px 8px' }}>
          {i.status === 'warning' ? <AlertTriangle size={13} /> : i.status === 'ok' ? <CheckCircle2 size={13} /> : <HelpCircle size={13} />}
          <span>{i.message}</span>
        </div>
      ))}
      {comp.warnings.filter((w) => !w.startsWith('No spacing')).map((w, k) => (
        <div key={`w${k}`} className="callout warn" style={{ padding: '5px 8px' }}>
          <AlertTriangle size={13} />
          <span>{w}</span>
        </div>
      ))}

      {!single && capacity.explanation.length > 0 && (
        <details>
          <summary className="small" style={{ cursor: 'pointer' }}>How was this calculated?</summary>
          <ol className="small" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {capacity.explanation.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ol>
          {plant && <p className="tiny muted" style={{ marginTop: 4 }}>Spacing source: {plant.provenance.sources.map((s) => s.id).join(', ')} · record confidence {plant.provenance.confidence}.</p>}
        </details>
      )}

      <details>
        <summary className="small" style={{ cursor: 'pointer' }}>Variety, dates, yield & notes</summary>
        <div className="col" style={{ marginTop: 8 }}>
          <div className="grid2">
            <Field label="Variety / cultivar">{(fid) => <TextInput id={fid} value={planting.variety} onChange={(v) => commit('Variety', { variety: v }, 'variety')} />}</Field>
            <Field label="Status">
              {(fid) => <Select<Planting['status']> id={fid} value={planting.status} options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value: value as Planting['status'], label }))} onChange={(v) => v && commit('Status', { status: v })} />}
            </Field>
          </div>
          <div className="grid2">
            {plant?.timing.sowIndoors && <DateField label="Sow indoors" value={planting.dates.sowIndoors} onChange={(v) => commit('Date', { dates: { sowIndoors: v } })} />}
            {plant?.timing.directSow && <DateField label="Sow outdoors" value={planting.dates.directSow} onChange={(v) => commit('Date', { dates: { directSow: v } })} />}
            {(plant?.timing.transplant || plant?.timing.plantOut) && <DateField label="Plant out / transplant" value={planting.dates.transplant} onChange={(v) => commit('Date', { dates: { transplant: v } })} />}
            <DateField label="Harvest from" value={planting.dates.harvestStart} onChange={(v) => commit('Date', { dates: { harvestStart: v } })} />
            <DateField label="Harvest until" value={planting.dates.harvestEnd} onChange={(v) => commit('Date', { dates: { harvestEnd: v } })} />
          </div>
          <p className="tiny muted">Leave dates empty to derive them from your frost dates. See the Calendar tab.</p>
          <YieldOverride planting={planting} onChange={(y) => commit('Expected yield', { yieldOverride: y })} />
          <Field label="Notes">{(fid) => <TextInput id={fid} multiline value={planting.notes} maxLength={20000} onChange={(v) => commit('Planting notes', { notes: v }, 'pnotes')} />}</Field>
          {!single && capacity.inRowMm && (
            <p className="tiny muted">
              Layout: {capacity.rows ?? 0} rows × up to {capacity.plantsPerRow ?? 0} plants, {formatLength(capacity.inRowMm)} apart
              {capacity.rowMm ? `, rows ${formatLength(capacity.rowMm)} apart` : ''}.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string | null | undefined; onChange: (v: string | null) => void }) {
  return <Field label={label}>{(fid) => <input id={fid} type="date" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} />}</Field>;
}

function YieldOverride({ planting, onChange }: { planting: Planting; onChange: (y: Planting['yieldOverride']) => void }) {
  const y = planting.yieldOverride;
  return (
    <div className="col" style={{ gap: 4 }}>
      <span className="field-label">Your expected yield (optional)</span>
      <div className="grid3">
        <Select<'total' | 'per-plant' | 'per-m2'>
          ariaLabel="Yield basis"
          value={y?.basis ?? ''}
          emptyLabel="Use data"
          options={[
            { value: 'total', label: 'Total kg' },
            { value: 'per-plant', label: 'kg / plant' },
            { value: 'per-m2', label: 'kg / m²' },
          ]}
          onChange={(b) => onChange(b ? { basis: b, minKg: y?.minKg ?? 0, maxKg: y?.maxKg ?? 0 } : null)}
        />
        <NumberInput ariaLabel="Minimum kg" value={y?.minKg} min={0} digits={2} disabled={!y} onCommit={(v) => y && onChange({ ...y, minKg: v ?? 0, maxKg: Math.max(v ?? 0, y.maxKg) })} />
        <NumberInput ariaLabel="Maximum kg" value={y?.maxKg} min={0} digits={2} disabled={!y} onCommit={(v) => y && onChange({ ...y, maxKg: Math.max(v ?? 0, y.minKg) })} />
      </div>
    </div>
  );
}
