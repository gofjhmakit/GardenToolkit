import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  CalendarDays,
  Circle,
  FileDown,
  Hand,
  ImagePlus,
  Leaf,
  Map as MapIcon,
  MousePointer2,
  Pencil,
  Ruler,
  Scale,
  Settings,
  Spline,
  Sprout,
  Square,
  Hexagon,
  TreeDeciduous,
  Type,
  MoveHorizontal,
  Repeat,
  Wheat,
  Download,
  ClipboardList,
  Flower2,
} from 'lucide-react';
import { OBJECT_KINDS_INFO, kindInfo } from '../../domain/objectKinds';
import type { ObjectKind } from '../../domain/project';
import { useEditor, type ToolId, type Workspace } from '../../editor/store';
import { usePrefs } from '../../app/prefs';
import { pickFile } from '../../lib/download';
import { importBlueprint } from '../../app/projectActions';
import { Canvas } from '../canvas/Canvas';
import { LayersPanel } from '../panels/LayersPanel';
import { Inspector } from '../panels/Inspector';
import { StatusBar } from './StatusBar';
import { MenuBar } from './MenuBar';
import { useShortcuts } from './useShortcuts';
import { ShortcutsDialog } from './ShortcutsDialog';
import { ContextMenuHost } from './ContextMenuHost';
import { AddPlantsDialog } from '../plants/AddPlantsDialog';
const PlantingsView = lazy(() => import('../views/PlantingsView').then((m) => ({ default: m.PlantingsView })));
const CalendarView = lazy(() => import('../views/CalendarView').then((m) => ({ default: m.CalendarView })));
const HarvestView = lazy(() => import('../views/HarvestView').then((m) => ({ default: m.HarvestView })));
const CareView = lazy(() => import('../views/CareView').then((m) => ({ default: m.CareView })));
const RotationView = lazy(() => import('../views/RotationView').then((m) => ({ default: m.RotationView })));
const PlantDatabaseView = lazy(() => import('../views/PlantDatabaseView').then((m) => ({ default: m.PlantDatabaseView })));
const ReportsView = lazy(() => import('../views/ReportsView').then((m) => ({ default: m.ReportsView })));
const SettingsView = lazy(() => import('../views/SettingsView').then((m) => ({ default: m.SettingsView })));
import { TabGuardBanner } from './TabGuardBanner';
import { MenuButton } from '../components/Menu';
import { exportProjectJson, exportProjectPackage } from '../../app/projectActions';

const TOOLS: { id: ToolId; label: string; key?: string; icon: React.ReactNode; kind?: ObjectKind }[] = [
  { id: 'select', label: 'Select', key: 'V', icon: <MousePointer2 size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'hand', label: 'Pan', key: 'H', icon: <Hand size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
];
const DRAW_TOOLS: { id: ToolId; label: string; key?: string; icon: React.ReactNode }[] = [
  { id: 'rect', label: 'Rectangle', key: 'R', icon: <Square size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'ellipse', label: 'Ellipse / circle', key: 'O', icon: <Circle size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'polygon', label: 'Polygon', key: 'P', icon: <Hexagon size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'freehand', label: 'Freehand area', key: 'F', icon: <Pencil size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'polyline', label: 'Line / path', key: 'L', icon: <Spline size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
];
const SYMBOL_TOOLS: { id: ToolId; label: string; icon: React.ReactNode }[] = [
  { id: 'tree', label: 'Tree', icon: <TreeDeciduous size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'shrub', label: 'Shrub / bush', icon: <Flower2 size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
];
const ANNOT_TOOLS: { id: ToolId; label: string; key?: string; icon: React.ReactNode }[] = [
  { id: 'text', label: 'Text label', key: 'T', icon: <Type size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'dimension', label: 'Dimension line', key: 'D', icon: <MoveHorizontal size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'measure', label: 'Measure distance', key: 'M', icon: <Ruler size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'calibrate', label: 'Calibrate blueprint scale', key: 'K', icon: <Scale size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
];

const WORKSPACES: { id: Workspace; label: string; icon: React.ReactNode }[] = [
  { id: 'design', label: 'Design', icon: <MapIcon size={14} strokeWidth={1.75} /> },
  { id: 'plantings', label: 'Plantings', icon: <Sprout size={14} strokeWidth={1.75} /> },
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={14} strokeWidth={1.75} /> },
  { id: 'harvest', label: 'Harvest', icon: <Wheat size={14} strokeWidth={1.75} /> },
  { id: 'care', label: 'Care guide', icon: <ClipboardList size={14} strokeWidth={1.75} /> },
  { id: 'rotation', label: 'Crop rotation', icon: <Repeat size={14} strokeWidth={1.75} /> },
  { id: 'plants', label: 'Plant database', icon: <BookOpen size={14} strokeWidth={1.75} /> },
  { id: 'reports', label: 'Reports & export', icon: <FileDown size={14} strokeWidth={1.75} /> },
  { id: 'settings', label: 'Garden settings', icon: <Settings size={14} strokeWidth={1.75} /> },
];

/** Kinds offered in the "Draw as" selector, grouped. */
const DRAWABLE_GROUPS = ['Beds & planting', 'Surfaces', 'Structures', 'Drawing'] as const;

export function EditorShell({ onHome }: { onHome: () => void }) {
  const doc = useEditor((s) => s.doc);
  const tool = useEditor((s) => s.tool);
  const drawKind = useEditor((s) => s.drawKind);
  const workspace = useEditor((s) => s.workspace);
  const showLeft = usePrefs((s) => s.showLeftPanel);
  const showRight = usePrefs((s) => s.showRightPanel);
  const { t } = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [addPlantsFor, setAddPlantsFor] = useState<string[] | null>(null);
  const onHelp = useCallback(() => setHelpOpen(true), []);
  useShortcuts({ onHelp, enabled: !addPlantsFor && !helpOpen });

  useEffect(() => {
    const onImport = async () => {
      const file = await pickFile('image/png,image/jpeg,image/webp,application/pdf');
      if (file) await importBlueprint(file);
    };
    const onImportFile = (e: Event) => {
      const file = (e as CustomEvent<{ file: File }>).detail.file;
      void importBlueprint(file);
    };
    const onAddPlants = (e: Event) => {
      const ids = (e as CustomEvent<{ ids: string[] }>).detail?.ids ?? useEditor.getState().selection;
      setAddPlantsFor(ids);
    };
    window.addEventListener('gtk:import-blueprint', onImport);
    window.addEventListener('gtk:import-blueprint-file', onImportFile);
    window.addEventListener('gtk:add-plants', onAddPlants);
    return () => {
      window.removeEventListener('gtk:import-blueprint', onImport);
      window.removeEventListener('gtk:import-blueprint-file', onImportFile);
      window.removeEventListener('gtk:add-plants', onAddPlants);
    };
  }, []);

  if (!doc) return null;
  const setTool = (id: ToolId) => useEditor.getState().setTool(id);
  const kindGroups = DRAWABLE_GROUPS.map((g) => ({
    group: g,
    kinds: Object.values(OBJECT_KINDS_INFO).filter((k) => k.group === g && k.kind !== 'line'),
  }));

  return (
    <div className="editor">
      <a href="#main-canvas" className="skip-link">
        Skip to canvas
      </a>
      <header className="topbar">
        <button className="icon-btn" onClick={onHome} title="All projects" aria-label="Back to all projects">
          <span className="brand-mark">
            <Leaf size={15} />
          </span>
        </button>
        <span className="project-name" title={doc.meta.name}>
          {doc.meta.name}
        </span>
        <MenuBar onHome={onHome} onHelp={onHelp} />
        <span className="tool-sep" />
        <div className="tools" role="toolbar" aria-label="Drawing tools">
          <div className="tool-group" role="group" aria-label="Selection">
            {TOOLS.map((t) => (
              <ToolButton key={t.id} active={tool === t.id} label={t.label} shortcut={t.key} onClick={() => setTool(t.id)}>
                {t.icon}
              </ToolButton>
            ))}
          </div>
          <div className="tool-group" role="group" aria-label="Shapes">
            <select
              className="select kind-select"
              aria-label="Object type to draw"
              title="Object type for the shape tools"
              value={drawKind}
              onChange={(e) => {
                const k = e.target.value as ObjectKind;
                const shape = kindInfo(k).defaultShape;
                const t: ToolId = shape === 'rect' ? 'rect' : shape === 'ellipse' ? 'ellipse' : shape === 'polyline' ? 'polyline' : 'polygon';
                useEditor.getState().setTool(workspaceToolFor(tool, t), k);
              }}
            >
              {kindGroups.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.kinds.map((k) => (
                    <option key={k.kind} value={k.kind}>
                      {k.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {DRAW_TOOLS.map((t) => (
              <ToolButton key={t.id} active={tool === t.id} label={`${t.label} — draws: ${kindInfo(drawKind).label}`} shortcut={t.key} onClick={() => setTool(t.id)}>
                {t.icon}
              </ToolButton>
            ))}
          </div>
          <div className="tool-group" role="group" aria-label="Plant symbols">
            {SYMBOL_TOOLS.map((t) => (
              <ToolButton key={t.id} active={tool === t.id} label={t.label} onClick={() => setTool(t.id)}>
                {t.icon}
              </ToolButton>
            ))}
          </div>
          <div className="tool-group" role="group" aria-label="Annotation and measuring">
            {ANNOT_TOOLS.map((t) => (
              <ToolButton key={t.id} active={tool === t.id} label={t.label} shortcut={t.key} onClick={() => setTool(t.id)}>
                {t.icon}
              </ToolButton>
            ))}
          </div>
        </div>
        <span className="spacer" />
        <button className="icon-btn" aria-label="Import blueprint image or PDF" title="Import blueprint image or PDF" onClick={() => window.dispatchEvent(new CustomEvent('gtk:import-blueprint'))}>
          <ImagePlus size={16} strokeWidth={1.75} absoluteStrokeWidth />
        </button>
        <ExportButton />
        <AddPlantsButton />
      </header>
      <nav className="worktabs" role="tablist" aria-label="Workspaces">
        {WORKSPACES.map((w) => (
          <button key={w.id} role="tab" aria-selected={workspace === w.id} onClick={() => useEditor.getState().setWorkspace(w.id)}>
            {w.icon}
            {t(w.label)}
          </button>
        ))}
      </nav>
      <TabGuardBanner />
      <main className="workspace" id="main-canvas">
        {workspace === 'design' ? (
          <>
            {showLeft ? <LayersPanel /> : <div />}
            <Canvas />
            {showRight ? <Inspector /> : <div />}
          </>
        ) : (
          <div className="view" role="tabpanel">
            <Suspense fallback={<div className="view-inner muted">Loading…</div>}>
            {workspace === 'plantings' && <PlantingsView />}
            {workspace === 'calendar' && <CalendarView />}
            {workspace === 'harvest' && <HarvestView />}
            {workspace === 'care' && <CareView />}
            {workspace === 'rotation' && <RotationView />}
            {workspace === 'plants' && <PlantDatabaseView />}
            {workspace === 'reports' && <ReportsView />}
            {workspace === 'settings' && <SettingsView />}
            </Suspense>
          </div>
        )}
      </main>
      <StatusBar />
      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      <ContextMenuHost />
      {addPlantsFor && <AddPlantsDialog objectIds={addPlantsFor} onClose={() => setAddPlantsFor(null)} />}
    </div>
  );
}

function workspaceToolFor(current: ToolId, suggested: ToolId): ToolId {
  // Keep the current shape tool if the user picked one explicitly and it fits.
  if (['rect', 'ellipse', 'polygon', 'freehand'].includes(current) && ['rect', 'ellipse', 'polygon'].includes(suggested)) return current;
  return suggested;
}

function ToolButton({ active, label, shortcut, onClick, children }: { active: boolean; label: string; shortcut?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="icon-btn" aria-pressed={active} aria-label={label} aria-keyshortcuts={shortcut} title={shortcut ? `${label} (${shortcut})` : label} onClick={onClick}>
      {children}
    </button>
  );
}

function AddPlantsButton() {
  const { t } = useTranslation();
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const plantable = doc ? selection.filter((id) => doc.objects[id] && kindInfo(doc.objects[id].kind).plantable) : [];
  return (
    <button
      className="btn primary sm"
      disabled={!plantable.length}
      title={plantable.length ? `Add plants to ${plantable.length} selected area(s)` : 'Select one or more beds or areas to add plants'}
      onClick={() => window.dispatchEvent(new CustomEvent('gtk:add-plants', { detail: { ids: plantable } }))}
    >
      <Sprout size={14} />
      {t('Add plants')}{plantable.length > 1 ? ` (${plantable.length})` : ''}
    </button>
  );
}


/** Always-visible export entry point (a project backup is the way to move a garden to another device). */
function ExportButton() {
  const doc = useEditor((s) => s.doc);
  if (!doc) return null;
  return (
    <MenuButton
      label="Export"
      className="btn sm"
      entries={() => [
        { type: 'label', label: 'Project backup (re-importable)' },
        { label: 'Project package (.gtkproject)', onSelect: () => void exportProjectPackage(useEditor.getState().doc!) },
        { label: 'Single JSON file', onSelect: () => void exportProjectJson(useEditor.getState().doc!, true) },
        { type: 'separator' },
        { label: 'PDF documents, plans & CSV…', onSelect: () => useEditor.getState().setWorkspace('reports') },
      ]}
    >
      <Download size={14} strokeWidth={1.75} />
      Export
    </MenuButton>
  );
}
