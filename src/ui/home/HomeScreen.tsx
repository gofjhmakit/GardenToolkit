import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, FileUp, Layers, Leaf, MoreHorizontal, Plus, Sprout, Trash2, WifiOff, Calculator, CalendarDays, FileDown, ShieldCheck, Pencil } from 'lucide-react';
import { deleteProject, duplicateProject, listProjects, loadProject, renameProject } from '../../persistence/projectRepo';
import type { ProjectMeta } from '../../persistence/db';
import { createNewProject, importProjectFromFile, navigate } from '../../app/projectActions';
import { pickFile } from '../../lib/download';
import { Dialog } from '../components/Dialog';
import { Menu } from '../components/Menu';
import { confirmAsync, promptAsync, toast } from '../components/feedback';
import { CLIMATE_PRESETS } from '../../engine/climate';
import { Field, Select, TextInput } from '../components/Fields';

export function HomeScreen() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<ProjectMeta[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [menu, setMenu] = useState<{ p: ProjectMeta; x: number; y: number } | null>(null);
  const refresh = () => void listProjects().then(setProjects).catch(() => setProjects([]));
  useEffect(refresh, []);
  const onImport = async () => {
    const f = await pickFile('.gtkproject,.zip,.json,application/json,application/zip');
    if (!f) return;
    const id = await importProjectFromFile(f);
    if (id) navigate(`#/p/${id}`);
    refresh();
  };
  return (
    <div className="home">
      <div className="home-inner">
        <header className="home-header">
          <div className="brand">
            <span className="brand-mark"><Leaf size={17} /></span>
            Garden Toolkit
          </div>
          <span className="spacer" />
          <button className="btn" onClick={onImport}><FileUp size={14} /> {t('Import project')}</button>
          <button className="btn primary" onClick={() => setCreateOpen(true)}><Plus size={14} /> {t('New garden')}</button>
        </header>
        <h1 style={{ marginBottom: 4 }}>{t('Your gardens')}</h1>
        <p className="muted" style={{ marginBottom: 18 }}>Plans are saved automatically in this browser. Nothing is uploaded.</p>
        {projects === null ? (
          <p className="muted">Loading…</p>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <Sprout size={32} color="var(--accent)" />
            <h2 style={{ margin: '10px 0 6px' }}>Plan your first garden</h2>
            <p>Draw beds on a scaled plan, pick plants, and get quantities, a planting calendar and printable guides.</p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
              <button className="btn primary" onClick={() => setCreateOpen(true)}><Plus size={14} /> New garden</button>
              <button className="btn" onClick={onImport}><FileUp size={14} /> Import a project file</button>
            </div>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((p) => (
              <div key={p.id} className="project-card" role="button" tabIndex={0} onClick={() => navigate(`#/p/${p.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`#/p/${p.id}`)} aria-label={`Open ${p.name}`}>
                <div className="row">
                  <span className="name" style={{ flex: 1 }}>{p.name}</span>
                  <button className="icon-btn sm" aria-label={`Actions for ${p.name}`} onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenu({ p, x: r.left, y: r.bottom + 2 }); }}>
                    <MoreHorizontal size={15} />
                  </button>
                </div>
                {p.description && <div className="small muted">{p.description.slice(0, 120)}</div>}
                <div className="small muted row" style={{ gap: 12 }}>
                  <span><Layers size={12} /> {p.objectCount} objects</span>
                  <span><Sprout size={12} /> {p.plantingCount} plantings</span>
                </div>
                <div className="tiny muted">Edited {new Date(p.updatedAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
        <div className="feature-list">
          <Feature icon={<Pencil size={18} />} title="CAD-style design" text="Import a site plan, calibrate its scale and draw beds, trees and paths in real units." />
          <Feature icon={<Calculator size={18} />} title="Honest calculations" text="Plant counts laid out on each bed’s real shape, with ranges and explanations." />
          <Feature icon={<CalendarDays size={18} />} title="Your calendar" text="Sowing, planting and harvest dates from your own frost dates." />
          <Feature icon={<FileDown size={18} />} title="Printable documents" text="Planting plan, care guide, harvest plan and a complete garden report as PDF." />
          <Feature icon={<WifiOff size={18} />} title="Works offline" text="Installable app; your plans and the plant database work without a connection." />
          <Feature icon={<ShieldCheck size={18} />} title="Private by design" text="No account, no tracking. Export a backup file whenever you like." />
        </div>
      </div>
      {createOpen && <CreateDialog onClose={() => setCreateOpen(false)} />}
      {menu && (
        <Menu
          label="Project actions"
          anchor={{ x: menu.x, y: menu.y }}
          onClose={() => setMenu(null)}
          entries={[
            { label: 'Open', onSelect: () => navigate(`#/p/${menu.p.id}`) },
            { label: 'Rename…', onSelect: async () => {
              const name = await promptAsync({ title: 'Rename project', label: 'Name', value: menu.p.name, confirmLabel: 'Rename' });
              if (name) { await renameProject(menu.p.id, name); refresh(); }
            } },
            { label: 'Duplicate', icon: <Copy size={13} />, onSelect: async () => {
              const res = await loadProject(menu.p.id);
              if (res?.ok) { await duplicateProject(res.doc, `${res.doc.meta.name} (copy)`); refresh(); }
              else toast('error', 'Could not duplicate the project');
            } },
            { type: 'separator' },
            { label: 'Delete…', icon: <Trash2 size={13} />, onSelect: async () => {
              if (await confirmAsync({ title: 'Delete project?', message: `"${menu.p.name}" will be permanently removed from this browser, including its images and versions.`, confirmLabel: 'Delete permanently', danger: true })) {
                await deleteProject(menu.p.id);
                refresh();
              }
            } },
          ]}
        />
      )}
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="feature">
      {icon}
      <div>
        <strong>{title}</strong>
        <div className="muted">{text}</div>
      </div>
    </div>
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('My garden');
  const [preset, setPreset] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    const p = CLIMATE_PRESETS.find((x) => x.id === preset);
    const id = await createNewProject(name, p ? { country: p.country, climateSystem: p.climateSystem, climateZone: p.zone, lastFrost: p.lastFrost, firstFrost: p.firstFrost, frostDateSource: p.note } : {});
    navigate(`#/p/${id}`);
  };
  return (
    <Dialog open title="New garden" onClose={onClose} initialFocus="new-name" footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!name.trim() || busy} onClick={create}>Create garden</button></>}>
      <form className="col" onSubmit={(e) => { e.preventDefault(); if (name.trim()) void create(); }}>
        <Field label="Name">{() => <TextInput id="new-name" value={name} onChange={setName} />}</Field>
        <Field label="Location (optional)" hint="Sets approximate frost dates for the calendar. You can refine them later in Garden settings.">
          {(id) => <Select id={id} value={preset} emptyLabel="Set later" options={CLIMATE_PRESETS.map((p) => ({ value: p.id, label: p.label }))} onChange={(v) => setPreset(v ?? '')} />}
        </Field>
      </form>
    </Dialog>
  );
}
