import { useMemo, useState } from 'react';
import { AlertTriangle, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { usePlantLookup } from '../../app/lookup';
import { usePlants } from '../../app/plantStore';
import { analyzeRotation, ROTATION_SEQUENCE } from '../../engine/rotation';
import { kindInfo } from '../../domain/objectKinds';
import { ROTATION_GROUPS, type RotationGroup } from '../../plants/schema';
import { newId } from '../../lib/ids';
import { Select } from '../components/Fields';

const GROUP_COLORS: Record<RotationGroup, string> = {
  legumes: '#2F6E3B',
  brassicas: '#35607F',
  alliums: '#7A4A9E',
  solanaceae: '#A9401A',
  roots: '#8A5A1E',
  cucurbits: '#7E6A0C',
  leafy: '#3E7A2E',
  perennial: '#5E5A52',
  other: '#6B665C',
};

export function RotationView() {
  const doc = useEditor((s) => s.doc)!;
  const lookup = usePlantLookup();
  const rules = usePlants((s) => s.catalog.rotationRules);
  const analysis = useMemo(() => analyzeRotation(doc, lookup, rules), [doc, lookup, rules]);
  const season = doc.settings.activeSeason;
  const years = [season - 3, season - 2, season - 1, season, season + 1];
  const beds = Object.values(doc.objects).filter((o) => kindInfo(o.kind).plantable && o.kind !== 'tree' && o.kind !== 'shrub').sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  const [bed, setBed] = useState<string>(beds[0]?.id ?? '');
  const [year, setYear] = useState(String(season - 1));
  const [group, setGroup] = useState<RotationGroup>('solanaceae');
  const [crop, setCrop] = useState('');
  const ruleOf = new Map(rules.map((r) => [r.group, r]));
  return (
    <div className="view-inner">
      <div className="view-header">
        <div>
          <h1>Crop rotation</h1>
          <p className="muted">Crop groups per bed over the years. Plantings from each season are included automatically; add earlier years manually below.</p>
        </div>
      </div>
      <div className="card flush">
        <table className="table" style={{ minWidth: 700 }}>
          <thead>
            <tr>
              <th>Bed</th>
              {years.map((y) => (
                <th key={y} style={{ color: y === season ? 'var(--accent)' : undefined }}>
                  {y}
                  {y === season ? ' (current)' : ''}
                </th>
              ))}
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {beds.map((o) => {
              const a = analysis.find((x) => x.objectId === o.id);
              return (
                <tr key={o.id}>
                  <td>
                    <strong>{o.code}</strong> {o.name}
                  </td>
                  {years.map((y) => {
                    const entries = a?.entries.filter((e) => e.season === y) ?? [];
                    const sug = a?.suggestion?.season === y && !entries.length ? a.suggestion : null;
                    return (
                      <td key={y}>
                        {entries.map((e) => (
                          <div key={e.group} className="badge" style={{ borderColor: GROUP_COLORS[e.group], color: GROUP_COLORS[e.group], marginBottom: 2 }} title={e.crops.join(', ')}>
                            {ruleOf.get(e.group)?.label.en ?? e.group}
                          </div>
                        ))}
                        {sug && (
                          <div className="badge" style={{ borderStyle: 'dashed' }} title={sug.reason}>
                            <Lightbulb size={10} /> {ruleOf.get(sug.group)?.label.en ?? sug.group}?
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td>
                    {a?.issues.map((i, k) => (
                      <div key={k} className="tiny" style={{ color: 'var(--warn)' }}>
                        <AlertTriangle size={11} /> {i.message}
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })}
            {beds.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No beds yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {beds.length > 0 && (
        <form
          className="card row wrap"
          onSubmit={(e) => {
            e.preventDefault();
            const y = Number(year);
            if (!bed || !Number.isInteger(y)) return;
            useEditor.getState().commit('Add rotation history', (d) => {
              d.rotationHistory.push({ id: newId('rot'), objectId: bed, season: y, group, crop: crop.trim() });
            });
            setCrop('');
          }}
        >
          <strong>Record an earlier season:</strong>
          <Select<string> ariaLabel="Bed" value={bed} options={beds.map((o) => ({ value: o.id, label: `${o.code} ${o.name}` }))} onChange={(v) => setBed(v ?? '')} className="sm" />
          <input className="input sm" style={{ width: 80 }} aria-label="Year" value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" />
          <Select<RotationGroup> ariaLabel="Crop group" value={group} options={ROTATION_GROUPS.filter((g) => g !== 'perennial').map((g) => ({ value: g, label: ruleOf.get(g)?.label.en ?? g }))} onChange={(v) => v && setGroup(v)} className="sm" />
          <input className="input sm" style={{ width: 160 }} placeholder="Crop (optional)" aria-label="Crop" value={crop} onChange={(e) => setCrop(e.target.value)} />
          <button className="btn sm primary" type="submit">
            <Plus size={13} /> Add
          </button>
        </form>
      )}
      {doc.rotationHistory.length > 0 && (
        <div className="card">
          <h4>Recorded history</h4>
          <table className="table">
            <tbody>
              {[...doc.rotationHistory].sort((a, b) => b.season - a.season).map((r) => (
                <tr key={r.id}>
                  <td>{doc.objects[r.objectId]?.code}</td>
                  <td>{r.season}</td>
                  <td>{ruleOf.get(r.group)?.label.en ?? r.group}</td>
                  <td>{r.crop}</td>
                  <td className="r">
                    <button className="icon-btn sm" aria-label="Delete record" onClick={() => useEditor.getState().commit('Delete rotation record', (d) => void (d.rotationHistory = d.rotationHistory.filter((x) => x.id !== r.id)))}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="card">
        <h4>Rotation guidance</h4>
        <p className="small muted">Suggestions follow one conventional four-course scheme ({ROTATION_SEQUENCE.map((g) => ruleOf.get(g)?.label.en ?? g).join(' → ')}); other schemes are equally valid. Intervals differ by crop group:</p>
        <table className="table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Minimum years between</th>
              <th>Why</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.group}>
                <td>{r.label.en}</td>
                <td>{r.minYearsBetween ? `${r.minYearsBetween.min}–${r.minYearsBetween.max}` : '—'}</td>
                <td>{r.reason.en}</td>
                <td>{r.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
