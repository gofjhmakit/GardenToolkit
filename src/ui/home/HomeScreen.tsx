import { useEffect, useState } from 'react';
import { Copy, Download, FileDown as FileDownIcon, FileJson, FileUp, Upload, Layers, Leaf, MoreHorizontal, Plus, Sprout, Trash2, WifiOff, Calculator, CalendarDays, FileDown, ShieldCheck, Pencil } from 'lucide-react';
import { deleteProject, duplicateProject, listProjects, loadProject, renameProject } from '../../persistence/projectRepo';
import type { ProjectMeta } from '../../persistence/db';
import { createNewProject, exportAllProjects, exportStoredProject, importProjectFiles, navigate, PROJECT_FILE_ACCEPT } from '../../app/projectActions';
import { pickFiles } from '../../lib/download';
import { Dialog } from '../components/Dialog';
import { Menu } from '../components/Menu';
import { confirmAsync, promptAsync, toast } from '../components/feedback';
import { CLIMATE_PRESETS } from '../../engine/climate';
import { Field, Select, TextInput } from '../components/Fields';
import { ProjectThumb, relativeTime } from './ProjectThumb';
import { APP_VERSION } from '../../persistence/projectFile';
import { t, tn } from '../../i18n';

export function HomeScreen() {
  const [projects, setProjects] = useState<ProjectMeta[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [menu, setMenu] = useState<{ p: ProjectMeta; x: number; y: number } | null>(null);
  const refresh = () => void listProjects().then(setProjects).catch(() => setProjects([]));
  useEffect(refresh, []);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const importFiles = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    try {
      const ids = await importProjectFiles(files);
      // A single imported project opens directly; several stay in the list.
      if (ids.length === 1) navigate(`#/p/${ids[0]}`);
    } finally {
      setBusy(false);
      refresh();
    }
  };
  const onImport = async () => importFiles(await pickFiles(PROJECT_FILE_ACCEPT));
  const onExportAll = async () => {
    setBusy(true);
    try {
      await exportAllProjects();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className={`home ${dragging ? 'drop-active' : ''}`}
      onDragOver={(e) => {
        if (![...e.dataTransfer.types].includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (!dragging) setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void importFiles([...e.dataTransfer.files]);
      }}
    >
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          <Upload size={28} />
          <strong>{t('Drop project files to import')}</strong>
          <span>.gtkproject, .json or a .gtkbackup of several projects</span>
        </div>
      )}
      <div className="home-inner">
        <header className="home-header">
          <div className="brand">
            <span className="brand-mark"><Leaf size={17} /></span>
            Garden Toolkit
          </div>
          <span className="spacer" />
          <button className="btn" onClick={onImport} disabled={busy} title={t('Import .gtkproject, .json or .gtkbackup files (you can also drop files here)')}><FileUp size={14} /> {t('Import project')}</button>
          {projects && projects.length > 0 && (
            <button className="btn" onClick={onExportAll} disabled={busy} title={t('Download all projects in one backup file')}><Download size={14} />{' '}{t('Export all')}</button>
          )}
          <button className="btn primary" onClick={() => setCreateOpen(true)}><Plus size={14} /> {t('New garden')}</button>
        </header>
        <h1 style={{ marginBottom: 4 }}>{t('Your gardens')}</h1>
        <p className="muted" style={{ marginBottom: 18 }}>{t('Plans are saved automatically in this browser. Nothing is uploaded. Export a project to move it to another browser or device, or drop project files here to import them.')}</p>
        {projects === null ? (
          <p className="muted">{t('Loading…')}</p>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Sprout size={20} /></div>
            <h2>{t('Plan your first garden')}</h2>
            <p>{t('Draw beds on a scaled plan, pick plants, and get quantities, a planting calendar and printable guides.')}</p>
            <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
              <button className="btn primary" onClick={() => setCreateOpen(true)}><Plus size={14} />{' '}{t('New garden')}</button>
              <button className="btn" onClick={onImport}><FileUp size={14} />{' '}{t('Import a project file')}</button>
            </div>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((p) => (
              <div key={p.id} className="project-card" role="button" tabIndex={0} onClick={() => navigate(`#/p/${p.id}`)} onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`#/p/${p.id}`);
                }
              }} aria-label={t('Open {{name}}', { name: p.name })}>
                <ProjectThumb id={p.id} updatedAt={p.updatedAt} />
                <div className="row">
                  <span className="name" style={{ flex: 1 }}>{p.name}</span>
                  <button className="icon-btn sm" aria-label={t('Actions for {{name}}', { name: p.name })} onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenu({ p, x: r.left, y: r.bottom + 2 }); }}>
                    <MoreHorizontal size={15} />
                  </button>
                </div>
                {p.description && <div className="small muted">{p.description.slice(0, 120)}</div>}
                <div className="small muted row" style={{ gap: 12 }}>
                  <span><Layers size={12} /> {tn('{{count}} objects', p.objectCount)}</span>
                  <span><Sprout size={12} /> {tn('{{count}} plantings', p.plantingCount)}</span>
                </div>
                <div className="project-meta" title={new Date(p.updatedAt).toLocaleString()}>{t('Edited {{when}}', { when: relativeTime(p.updatedAt) })}</div>
              </div>
            ))}
          </div>
        )}
        {projects && projects.length < 3 && <h2 className="home-section-title">{t('What you can do')}</h2>}
        {projects && projects.length < 3 && <div className="feature-list">
          <Feature icon={<Pencil size={18} />} title={t('CAD-style design')} text={t('Import a site plan, calibrate its scale and draw beds, trees and paths in real units.')} />
          <Feature icon={<Calculator size={18} />} title={t('Honest calculations')} text={t('Plant counts laid out on each bed’s real shape, with ranges and explanations.')} />
          <Feature icon={<CalendarDays size={18} />} title={t('Your calendar')} text={t('Sowing, planting and harvest dates from your own frost dates.')} />
          <Feature icon={<FileDown size={18} />} title={t('Printable documents')} text={t('Planting plan, care guide, harvest plan and a complete garden report as PDF.')} />
          <Feature icon={<WifiOff size={18} />} title={t('Works offline')} text={t('Installable app; your plans and the plant database work without a connection.')} />
          <Feature icon={<ShieldCheck size={18} />} title={t('Private by design')} text={t('No account, no tracking. Export a backup file whenever you like.')} />
        </div>}
        <p className="app-version">Garden Toolkit {APP_VERSION}</p>
      </div>
      {createOpen && <CreateDialog onClose={() => setCreateOpen(false)} />}
      {menu && (
        <Menu
          label={t('Project actions')}
          anchor={{ x: menu.x, y: menu.y }}
          onClose={() => setMenu(null)}
          entries={[
            { label: t('Open'), onSelect: () => navigate(`#/p/${menu.p.id}`) },
            { label: t('Rename…'), onSelect: async () => {
              const name = await promptAsync({ title: t('Rename project'), label: t('Name'), value: menu.p.name, confirmLabel: t('Rename') });
              if (name) { await renameProject(menu.p.id, name); refresh(); }
            } },
            { type: 'separator' },
            { label: t('Export backup (.gtkproject)'), icon: <FileDownIcon size={13} />, onSelect: () => void exportStoredProject(menu.p.id, 'package') },
            { label: t('Export as JSON'), icon: <FileJson size={13} />, onSelect: () => void exportStoredProject(menu.p.id, 'json') },
            { type: 'separator' },
            { label: t('Duplicate'), icon: <Copy size={13} />, onSelect: async () => {
              const res = await loadProject(menu.p.id);
              if (res?.ok) { await duplicateProject(res.doc, t("{{name}} (copy)", { name: res.doc.meta.name })); refresh(); }
              else toast('error', t('Could not duplicate the project'));
            } },
            { type: 'separator' },
            { label: t('Delete…'), icon: <Trash2 size={13} />, onSelect: async () => {
              if (await confirmAsync({ title: t('Delete project?'), message: t('"{{name}}" will be permanently removed from this browser, including its images and versions.', { name: menu.p.name }), confirmLabel: t('Delete permanently'), danger: true })) {
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
    <Dialog open title={t('New garden')} onClose={onClose} initialFocus="new-name" footer={<><button className="btn" onClick={onClose}>{t('Cancel')}</button><button className="btn primary" disabled={!name.trim() || busy} onClick={create}>{t('Create garden')}</button></>}>
      <form className="col" onSubmit={(e) => { e.preventDefault(); if (name.trim()) void create(); }}>
        <Field label={t('Name')}>{() => <TextInput id="new-name" value={name} onChange={setName} />}</Field>
        <Field label={t('Location (optional)')} hint={t('Sets approximate frost dates for the calendar. You can refine them later in Garden settings.')}>
          {(id) => <Select id={id} value={preset} emptyLabel={t('Set later')} options={CLIMATE_PRESETS.map((p) => ({ value: p.id, label: p.label }))} onChange={(v) => setPreset(v ?? '')} />}
        </Field>
      </form>
    </Dialog>
  );
}
