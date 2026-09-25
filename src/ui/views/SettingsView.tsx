import { useEffect, useState } from 'react';
import { History, MapPin, RotateCcw, Trash2, HardDrive, StickyNote, Plus } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { CLIMATE_PRESETS, frostFreeDays } from '../../engine/climate';
import { Field, NumberInput, Select, TextInput, LengthInput } from '../components/Fields';
import { deleteSnapshot, listSnapshots } from '../../persistence/projectRepo';
import { restoreSnapshot } from '../../app/projectActions';
import { confirmAsync, toast } from '../components/feedback';
import { storageEstimate, requestPersistentStorage } from '../../persistence/db';
import type { SnapshotRecord } from '../../persistence/db';
import type { LocationSettings } from '../../domain/project';
import { newId } from '../../lib/ids';
import { usePrefs } from '../../app/prefs';

export function SettingsView() {
  const doc = useEditor((s) => s.doc)!;
  const loc = doc.location;
  const commit = (label: string, fn: (d: typeof doc) => void, key?: string) => useEditor.getState().commit(label, fn, key ? { coalesceKey: key } : undefined);
  const setLoc = (patch: Partial<LocationSettings>, label = 'Edit location', key?: string) => commit(label, (d) => Object.assign(d.location, patch), key);
  const presetId = CLIMATE_PRESETS.find((p) => p.zone === loc.climateZone && p.climateSystem === loc.climateSystem && p.lastFrost === loc.lastFrost && p.firstFrost === loc.firstFrost)?.id ?? '';
  const ffd = frostFreeDays(loc);
  const lang = usePrefs((s) => s.language);
  const theme = usePrefs((s) => s.theme);
  return (
    <div className="view-inner" style={{ maxWidth: 900 }}>
      <h1>Garden settings</h1>
      <section className="card col">
        <h2>Project</h2>
        <div className="grid2">
          <Field label="Name">{(id) => <TextInput id={id} value={doc.meta.name} onChange={(v) => v.trim() && commit('Rename project', (d) => void (d.meta.name = v), 'project-name')} />}</Field>
          <Field label="Planning season">{(id) => <NumberInput id={id} integer value={doc.settings.activeSeason} min={1900} max={2200} onCommit={(v) => v && commit('Change season', (d) => void (d.settings.activeSeason = v))} />}</Field>
        </div>
        <Field label="Description">{(id) => <TextInput id={id} multiline maxLength={5000} value={doc.meta.description} onChange={(v) => commit('Edit description', (d) => void (d.meta.description = v), 'project-desc')} />}</Field>
        <div className="grid3">
          <Field label="Theme">
            {(id) => <Select<'system' | 'light' | 'dark'> id={id} value={theme} options={[{ value: 'system', label: 'Match system' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={(v) => v && usePrefs.getState().set({ theme: v })} />}
          </Field>
          <Field label="Units">
            {(id) => <Select<'metric' | 'imperial'> id={id} value={doc.settings.unitSystem} options={[{ value: 'metric', label: 'Metric (m, cm, m²)' }, { value: 'imperial', label: 'Imperial (ft, in, ft²)' }]} onChange={(v) => v && commit('Units', (d) => void (d.settings.unitSystem = v))} />}
          </Field>
          <Field label="Grid size">{(id) => <LengthInput id={id} unit={doc.settings.unitSystem === 'imperial' ? 'in' : 'cm'} valueMm={doc.settings.gridSizeMm} min={10} onCommit={(v) => v && commit('Grid size', (d) => void (d.settings.gridSizeMm = v))} />}</Field>
          <Field label="Interface language" hint="Finnish translation is in progress">
            {(id) => <Select id={id} value={lang} options={[{ value: 'en', label: 'English' }, { value: 'fi', label: 'Suomi (partial)' }]} onChange={(v) => v && usePrefs.getState().set({ language: v })} />}
          </Field>
        </div>
      </section>

      <section className="card col">
        <h2><MapPin size={16} style={{ verticalAlign: -2 }} /> Location & climate</h2>
        <p className="small muted">Frost dates drive the planting calendar and harvest windows. Location data stays in this browser.</p>
        <Field label="Quick preset" hint="Presets only fill the fields below with rounded, low-confidence approximations — replace them with local data when you can.">
          {(id) => (
            <Select<string>
              id={id}
              value={presetId}
              emptyLabel="Choose a preset…"
              options={CLIMATE_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
              onChange={(v) => {
                const p = CLIMATE_PRESETS.find((x) => x.id === v);
                if (p) setLoc({ country: p.country, climateSystem: p.climateSystem, climateZone: p.zone, lastFrost: p.lastFrost, firstFrost: p.firstFrost, frostDateSource: p.note }, 'Apply climate preset');
              }}
            />
          )}
        </Field>
        <div className="grid2">
          <Field label="Country">{(id) => <TextInput id={id} value={loc.country ?? ''} onChange={(v) => setLoc({ country: v || null }, 'Edit location', 'loc-country')} />}</Field>
          <Field label="Region / municipality">{(id) => <TextInput id={id} value={loc.region ?? ''} onChange={(v) => setLoc({ region: v || null }, 'Edit location', 'loc-region')} />}</Field>
          <Field label="Climate zone system">
            {(id) => <Select id={id} value={loc.climateSystem ?? ''} emptyLabel="None" options={[{ value: 'finnish-zone', label: 'Finnish growing zones (I–VIII)' }, { value: 'usda', label: 'USDA hardiness zones' }, { value: 'other', label: 'Other' }]} onChange={(v) => setLoc({ climateSystem: v })} />}
          </Field>
          <Field label="Zone">{(id) => <TextInput id={id} value={loc.climateZone ?? ''} maxLength={20} placeholder={loc.climateSystem === 'finnish-zone' ? 'e.g. III' : loc.climateSystem === 'usda' ? 'e.g. 5b' : ''} onChange={(v) => setLoc({ climateZone: v || null }, 'Edit zone', 'loc-zone')} />}</Field>
          <Field label="Average last spring frost">{(id) => <MonthDay id={id} value={loc.lastFrost} onChange={(v) => setLoc({ lastFrost: v })} />}</Field>
          <Field label="Average first autumn frost">{(id) => <MonthDay id={id} value={loc.firstFrost} onChange={(v) => setLoc({ firstFrost: v })} />}</Field>
          <Field label="Latitude (optional)" hint="Used only to detect the southern hemisphere">{(id) => <NumberInput id={id} value={loc.latitude} min={-90} max={90} digits={4} allowEmpty onCommit={(v) => setLoc({ latitude: v })} />}</Field>
          <Field label="Longitude (optional)">{(id) => <NumberInput id={id} value={loc.longitude} min={-180} max={180} digits={4} allowEmpty onCommit={(v) => setLoc({ longitude: v })} />}</Field>
        </div>
        <Field label="Source of frost dates">{(id) => <TextInput id={id} value={loc.frostDateSource ?? ''} maxLength={300} onChange={(v) => setLoc({ frostDateSource: v || null }, 'Edit source', 'loc-src')} placeholder="e.g. own records 2019–2025" />}</Field>
        {ffd && <p className="small">Frost-free period: about <strong>{ffd} days</strong>.</p>}
      </section>

      <NotesSection />
      <VersionsSection projectId={doc.id} />
      <StorageSection />
    </div>
  );
}

function MonthDay({ id, value, onChange }: { id: string; value: string | null; onChange: (v: string | null) => void }) {
  const year = 2001;
  return (
    <input
      id={id}
      className="input"
      type="date"
      min={`${year}-01-01`}
      max={`${year}-12-31`}
      value={value ? `${year}-${value}` : ''}
      onChange={(e) => onChange(e.target.value ? e.target.value.slice(5) : null)}
    />
  );
}

function NotesSection() {
  const doc = useEditor((s) => s.doc)!;
  const commit = useEditor.getState().commit;
  return (
    <section className="card col">
      <div className="row">
        <h2 style={{ flex: 1 }}><StickyNote size={16} style={{ verticalAlign: -2 }} /> Garden notes</h2>
        <button className="btn sm" onClick={() => commit('Add note', (d) => void d.notes.push({ id: newId('note'), title: 'New note', body: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }))}>
          <Plus size={13} /> Add note
        </button>
      </div>
      {doc.notes.length === 0 && <p className="muted small">Notes appear in the complete garden report.</p>}
      {doc.notes.map((n) => (
        <div key={n.id} className="col" style={{ gap: 4, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div className="row">
            <input className="input" aria-label="Note title" value={n.title} maxLength={300} onChange={(e) => commit('Edit note', (d) => { const x = d.notes.find((y) => y.id === n.id)!; x.title = e.target.value; x.updatedAt = new Date().toISOString(); }, { coalesceKey: `note-t-${n.id}` })} />
            <button className="icon-btn sm" aria-label="Delete note" onClick={() => commit('Delete note', (d) => void (d.notes = d.notes.filter((y) => y.id !== n.id)))}>
              <Trash2 size={13} />
            </button>
          </div>
          <textarea className="textarea" aria-label="Note text" value={n.body} maxLength={50000} onChange={(e) => commit('Edit note', (d) => { const x = d.notes.find((y) => y.id === n.id)!; x.body = e.target.value; x.updatedAt = new Date().toISOString(); }, { coalesceKey: `note-b-${n.id}` })} />
        </div>
      ))}
    </section>
  );
}

function VersionsSection({ projectId }: { projectId: string }) {
  const [snaps, setSnaps] = useState<Omit<SnapshotRecord, 'doc'>[]>([]);
  const refresh = () => void listSnapshots(projectId).then(setSnaps);
  useEffect(refresh, [projectId]);
  return (
    <section className="card col">
      <h2><History size={16} style={{ verticalAlign: -2 }} /> Versions</h2>
      <p className="small muted">Automatic snapshots are taken when you open the project and every 15 minutes while editing (the latest 20 are kept). Press {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+S to store a named version. Restoring is itself undoable.</p>
      {snaps.length === 0 && <p className="muted small">No versions yet.</p>}
      <table className="table">
        <tbody>
          {snaps.map((s) => (
            <tr key={s.id}>
              <td>{new Date(s.createdAt).toLocaleString()}</td>
              <td>{s.label}</td>
              <td>{s.auto ? <span className="badge">auto</span> : <span className="badge accent">saved</span>}</td>
              <td className="r">
                <button className="btn sm" onClick={async () => {
                  if (await confirmAsync({ title: 'Restore this version?', message: 'The current state will be replaced. You can undo the restore with Undo.', confirmLabel: 'Restore' })) {
                    if (await restoreSnapshot(s.id)) toast('ok', 'Version restored');
                  }
                }}>
                  <RotateCcw size={13} /> Restore
                </button>
                <button className="icon-btn sm" aria-label="Delete version" onClick={async () => { await deleteSnapshot(s.id); refresh(); }}>
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function StorageSection() {
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    void storageEstimate().then(setEst);
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);
  const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;
  return (
    <section className="card col">
      <h2><HardDrive size={16} style={{ verticalAlign: -2 }} /> Storage & privacy</h2>
      <p className="small">
        All projects, images and settings are stored locally in this browser (IndexedDB). Garden Toolkit has no account system and sends no project data or analytics anywhere. The only network requests load the app itself and its bundled plant database, which are then cached for offline use.
      </p>
      {est && <p className="small">Using {mb(est.usage)} of about {mb(est.quota)} available to this site.</p>}
      <p className="small">
        Persistent storage: {persisted == null ? 'unknown' : persisted ? 'granted — the browser will not evict your data automatically' : 'not granted — the browser may clear data under storage pressure.'}{' '}
        {!persisted && (
          <button className="btn sm" onClick={async () => setPersisted(await requestPersistentStorage())}>
            Request persistent storage
          </button>
        )}
      </p>
      <p className="small muted">Browser data can still be lost (clearing site data, private windows). Export a project backup regularly from Reports & export.</p>
    </section>
  );
}
