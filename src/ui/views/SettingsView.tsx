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
import { LANGUAGES, setLanguage, t } from '../../i18n';
import { flushSave } from '../../app/autosave';

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
      <h1>{t('Garden settings')}</h1>
      <section className="card col">
        <h2>{t('Project')}</h2>
        <div className="grid2">
          <Field label={t('Name')}>{(id) => <TextInput id={id} value={doc.meta.name} onChange={(v) => v.trim() && commit('Rename project', (d) => void (d.meta.name = v), 'project-name')} />}</Field>
          <Field label={t('Planning season')}>{(id) => <NumberInput id={id} integer value={doc.settings.activeSeason} min={1900} max={2200} onCommit={(v) => v && commit('Change season', (d) => void (d.settings.activeSeason = v))} />}</Field>
        </div>
        <Field label={t('Description')}>{(id) => <TextInput id={id} multiline maxLength={5000} value={doc.meta.description} onChange={(v) => commit('Edit description', (d) => void (d.meta.description = v), 'project-desc')} />}</Field>
        <div className="grid3">
          <Field label={t('Theme')}>
            {(id) => <Select<'system' | 'light' | 'dark'> id={id} value={theme} options={[{ value: 'system', label: t('Match system') }, { value: 'light', label: t('Light') }, { value: 'dark', label: t('Dark') }]} onChange={(v) => v && usePrefs.getState().set({ theme: v })} />}
          </Field>
          <Field label={t('Units')}>
            {(id) => <Select<'metric' | 'imperial'> id={id} value={doc.settings.unitSystem} options={[{ value: 'metric', label: t('Metric (m, cm, m²)') }, { value: 'imperial', label: t('Imperial (ft, in, ft²)') }]} onChange={(v) => v && commit('Units', (d) => void (d.settings.unitSystem = v))} />}
          </Field>
          <Field label={t('Grid size')}>{(id) => <LengthInput id={id} unit={doc.settings.unitSystem === 'imperial' ? 'in' : 'cm'} valueMm={doc.settings.gridSizeMm} min={10} onCommit={(v) => v && commit('Grid size', (d) => void (d.settings.gridSizeMm = v))} />}</Field>
          <Field label={t('Interface language')} hint={t('Changing the language saves your work and reloads the app.')}>
            {(id) => <Select id={id} value={lang} options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))} onChange={(v) => v && void setLanguage(v, () => flushSave())} />}
          </Field>
        </div>
      </section>

      <section className="card col">
        <h2><MapPin size={16} style={{ verticalAlign: -2 }} />{' '}{t('Location & climate')}</h2>
        <p className="small muted">{t('Frost dates drive the planting calendar and harvest windows. Location data stays in this browser.')}</p>
        <Field label={t('Quick preset')} hint={t('Presets only fill the fields below with rounded, low-confidence approximations — replace them with local data when you can.')}>
          {(id) => (
            <Select<string>
              id={id}
              value={presetId}
              emptyLabel={t('Choose a preset…')}
              options={CLIMATE_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
              onChange={(v) => {
                const p = CLIMATE_PRESETS.find((x) => x.id === v);
                if (p) setLoc({ country: p.country, climateSystem: p.climateSystem, climateZone: p.zone, lastFrost: p.lastFrost, firstFrost: p.firstFrost, frostDateSource: p.note }, 'Apply climate preset');
              }}
            />
          )}
        </Field>
        <div className="grid2">
          <Field label={t('Country')}>{(id) => <TextInput id={id} value={loc.country ?? ''} maxLength={80} onChange={(v) => setLoc({ country: v || null }, 'Edit location', 'loc-country')} />}</Field>
          <Field label={t('Region / municipality')}>{(id) => <TextInput id={id} value={loc.region ?? ''} maxLength={120} onChange={(v) => setLoc({ region: v || null }, 'Edit location', 'loc-region')} />}</Field>
          <Field label={t('Climate zone system')}>
            {(id) => <Select id={id} value={loc.climateSystem ?? ''} emptyLabel={t('None')} options={[{ value: 'finnish-zone', label: t('Finnish growing zones (I–VIII)') }, { value: 'usda', label: t('USDA hardiness zones') }, { value: 'other', label: t('Other') }]} onChange={(v) => setLoc({ climateSystem: v })} />}
          </Field>
          <Field label={t('Zone')}>{(id) => <TextInput id={id} value={loc.climateZone ?? ''} maxLength={20} placeholder={loc.climateSystem === 'finnish-zone' ? t('e.g. III') : loc.climateSystem === 'usda' ? 'e.g. 5b' : ''} onChange={(v) => setLoc({ climateZone: v || null }, 'Edit zone', 'loc-zone')} />}</Field>
          <Field label={t('Average last spring frost')}>{(id) => <MonthDay id={id} value={loc.lastFrost} onChange={(v) => setLoc({ lastFrost: v })} />}</Field>
          <Field label={t('Average first autumn frost')}>{(id) => <MonthDay id={id} value={loc.firstFrost} onChange={(v) => setLoc({ firstFrost: v })} />}</Field>
          <Field label={t('Latitude (optional)')} hint={t('Used only to detect the southern hemisphere')}>{(id) => <NumberInput id={id} value={loc.latitude} min={-90} max={90} digits={4} allowEmpty onCommit={(v) => setLoc({ latitude: v })} />}</Field>
          <Field label={t('Longitude (optional)')}>{(id) => <NumberInput id={id} value={loc.longitude} min={-180} max={180} digits={4} allowEmpty onCommit={(v) => setLoc({ longitude: v })} />}</Field>
        </div>
        <Field label={t('Source of frost dates')}>{(id) => <TextInput id={id} value={loc.frostDateSource ?? ''} maxLength={300} onChange={(v) => setLoc({ frostDateSource: v || null }, 'Edit source', 'loc-src')} placeholder={t('e.g. own records 2019–2025')} />}</Field>
        {ffd && <p className="small">{t('Frost-free period: about {{days}} days.', { days: ffd })}</p>}
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
        <h2 style={{ flex: 1 }}><StickyNote size={16} style={{ verticalAlign: -2 }} />{' '}{t('Garden notes')}</h2>
        <button className="btn sm" onClick={() => commit('Add note', (d) => void d.notes.push({ id: newId('note'), title: t('New note'), body: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }))}>
          <Plus size={13} />{' '}{t('Add note')}
        </button>
      </div>
      {doc.notes.length === 0 && <p className="muted small">{t('Notes appear in the complete garden report.')}</p>}
      {doc.notes.map((n) => (
        <div key={n.id} className="col" style={{ gap: 4, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div className="row">
            <input className="input" aria-label={t('Note title')} value={n.title} maxLength={300} onChange={(e) => commit('Edit note', (d) => { const x = d.notes.find((y) => y.id === n.id)!; x.title = e.target.value; x.updatedAt = new Date().toISOString(); }, { coalesceKey: `note-t-${n.id}` })} />
            <button className="icon-btn sm" aria-label={t('Delete note')} onClick={() => commit('Delete note', (d) => void (d.notes = d.notes.filter((y) => y.id !== n.id)))}>
              <Trash2 size={13} />
            </button>
          </div>
          <textarea className="textarea" aria-label={t('Note text')} value={n.body} maxLength={50000} onChange={(e) => commit('Edit note', (d) => { const x = d.notes.find((y) => y.id === n.id)!; x.body = e.target.value; x.updatedAt = new Date().toISOString(); }, { coalesceKey: `note-b-${n.id}` })} />
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
      <h2><History size={16} style={{ verticalAlign: -2 }} />{' '}{t('Versions')}</h2>
      <p className="small muted">{t('Automatic snapshots are taken when you open the project and every 15 minutes while editing (the latest 20 are kept). Press {{key}}+S to store a named version. Restoring is itself undoable.', { key: navigator.platform.includes('Mac') ? '⌘' : t('Ctrl') })}</p>
      {snaps.length === 0 && <p className="muted small">{t('No versions yet.')}</p>}
      <table className="table">
        <tbody>
          {snaps.map((s) => (
            <tr key={s.id}>
              <td>{new Date(s.createdAt).toLocaleString()}</td>
              <td>{s.label}</td>
              <td>{s.auto ? <span className="badge">auto</span> : <span className="badge accent">saved</span>}</td>
              <td className="r">
                <button className="btn sm" onClick={async () => {
                  if (await confirmAsync({ title: t('Restore this version?'), message: t('The current state will be replaced. You can undo the restore with Undo.'), confirmLabel: t('Restore') })) {
                    if (await restoreSnapshot(s.id)) toast('ok', t('Version restored'));
                  }
                }}>
                  <RotateCcw size={13} />{' '}{t('Restore')}
                </button>
                <button className="icon-btn sm" aria-label={t('Delete version')} onClick={async () => { await deleteSnapshot(s.id); refresh(); }}>
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
      <h2><HardDrive size={16} style={{ verticalAlign: -2 }} />{' '}{t('Storage & privacy')}</h2>
      <p className="small">
        {t('All projects, images and settings are stored locally in this browser (IndexedDB). Garden Toolkit has no account system and sends no project data or analytics anywhere. The only network requests load the app itself and its bundled plant database, which are then cached for offline use.')}
      </p>
      {est && <p className="small">{t('Using {{used}} of about {{quota}} available to this site.', { used: mb(est.usage), quota: mb(est.quota) })}</p>}
      <p className="small">
        {t('Persistent storage:')} {persisted == null ? t('unknown') : persisted ? t('granted — the browser will not evict your data automatically') : t('not granted — the browser may clear data under storage pressure.')}{' '}
        {!persisted && (
          <button className="btn sm" onClick={async () => setPersisted(await requestPersistentStorage())}>
            {t('Request persistent storage')}
          </button>
        )}
      </p>
      <p className="small muted">{t('Browser data can still be lost (clearing site data, private windows). Export a project backup regularly from Reports & export.')}</p>
    </section>
  );
}
