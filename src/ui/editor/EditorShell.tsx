import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
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
  Layers as LayersIcon,
  PanelBottomOpen,
  Undo2,
  Redo2,
  X,
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
import { useCompact } from '../useCompact';
import { t } from '../../i18n';

const TOOLS: { id: ToolId; label: string; key?: string; icon: React.ReactNode; kind?: ObjectKind }[] = [
  { id: 'select', label: t('Select'), key: 'V', icon: <MousePointer2 size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'hand', label: t('Pan'), key: 'H', icon: <Hand size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
];
const DRAW_TOOLS: { id: ToolId; label: string; key?: string; icon: React.ReactNode }[] = [
  { id: 'rect', label: t('Rectangle'), key: 'R', icon: <Square size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'ellipse', label: t('Ellipse / circle'), key: 'O', icon: <Circle size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'polygon', label: t('Polygon'), key: 'P', icon: <Hexagon size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'freehand', label: t('Freehand area'), key: 'F', icon: <Pencil size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'polyline', label: t('Line / path'), key: 'L', icon: <Spline size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
];
const SYMBOL_TOOLS: { id: ToolId; label: string; icon: React.ReactNode }[] = [
  { id: 'tree', label: t('Tree'), icon: <TreeDeciduous size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'shrub', label: t('Shrub / bush'), icon: <Flower2 size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
];
const ANNOT_TOOLS: { id: ToolId; label: string; key?: string; icon: React.ReactNode }[] = [
  { id: 'text', label: t('Text label'), key: 'T', icon: <Type size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'dimension', label: t('Dimension line'), key: 'D', icon: <MoveHorizontal size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'measure', label: t('Measure distance'), key: 'M', icon: <Ruler size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
  { id: 'calibrate', label: t('Calibrate blueprint scale'), key: 'K', icon: <Scale size={16} strokeWidth={1.75} absoluteStrokeWidth /> },
];

const WORKSPACES: { id: Workspace; label: string; icon: React.ReactNode }[] = [
  { id: 'design', label: t('Design'), icon: <MapIcon size={14} strokeWidth={1.75} /> },
  { id: 'plantings', label: t('Plantings'), icon: <Sprout size={14} strokeWidth={1.75} /> },
  { id: 'calendar', label: t('Calendar'), icon: <CalendarDays size={14} strokeWidth={1.75} /> },
  { id: 'harvest', label: t('Harvest'), icon: <Wheat size={14} strokeWidth={1.75} /> },
  { id: 'care', label: t('Care guide'), icon: <ClipboardList size={14} strokeWidth={1.75} /> },
  { id: 'rotation', label: t('Crop rotation'), icon: <Repeat size={14} strokeWidth={1.75} /> },
  { id: 'plants', label: t('Plant database'), icon: <BookOpen size={14} strokeWidth={1.75} /> },
  { id: 'reports', label: t('Reports & export'), icon: <FileDown size={14} strokeWidth={1.75} /> },
  { id: 'settings', label: t('Garden settings'), icon: <Settings size={14} strokeWidth={1.75} /> },
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [addPlantsFor, setAddPlantsFor] = useState<string[] | null>(null);
  const compact = useCompact();
  const [sheet, setSheet] = useState<'layers' | 'details' | null>(null);
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

  const toolbar = (
    <div className="tools" role="toolbar" aria-label={t('Drawing tools')}>
      <div className="tool-group" role="group" aria-label={t('Selection')}>
        {TOOLS.map((tb) => (
          <ToolButton key={tb.id} active={tool === tb.id} label={tb.label} shortcut={tb.key} onClick={() => setTool(tb.id)}>
            {tb.icon}
          </ToolButton>
        ))}
      </div>
      <div className="tool-group" role="group" aria-label={t('Shapes')}>
        <select
          className="select kind-select"
          aria-label={t('Object type to draw')}
          title={t('Object type for the shape tools')}
          value={drawKind}
          onChange={(e) => {
            const k = e.target.value as ObjectKind;
            const shape = kindInfo(k).defaultShape;
            const t: ToolId = shape === 'rect' ? 'rect' : shape === 'ellipse' ? 'ellipse' : shape === 'polyline' ? 'polyline' : 'polygon';
            useEditor.getState().setTool(workspaceToolFor(tool, t), k);
          }}
        >
          {kindGroups.map((g) => (
            <optgroup key={g.group} label={t(g.group)}>
              {g.kinds.map((k) => (
                <option key={k.kind} value={k.kind}>
                  {k.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {DRAW_TOOLS.map((tb) => (
          <ToolButton key={tb.id} active={tool === tb.id} label={t('{{tool}} — draws: {{kind}}', { tool: tb.label, kind: kindInfo(drawKind).label })} shortcut={tb.key} onClick={() => setTool(tb.id)}>
            {tb.icon}
          </ToolButton>
        ))}
      </div>
      <div className="tool-group" role="group" aria-label={t('Plant symbols')}>
        {SYMBOL_TOOLS.map((tb) => (
          <ToolButton key={tb.id} active={tool === tb.id} label={tb.label} onClick={() => setTool(tb.id)}>
            {tb.icon}
          </ToolButton>
        ))}
      </div>
      <div className="tool-group" role="group" aria-label={t('Annotation and measuring')}>
        {ANNOT_TOOLS.map((tb) => (
          <ToolButton key={tb.id} active={tool === tb.id} label={tb.label} shortcut={tb.key} onClick={() => setTool(tb.id)}>
            {tb.icon}
          </ToolButton>
        ))}
      </div>
    </div>
  );

  return (
    <div className={compact ? 'editor compact' : 'editor'}>
      <a href="#main-canvas" className="skip-link">
        {t('Skip to canvas')}
      </a>
      <header className="topbar">
        <button className="icon-btn" onClick={onHome} title={t('All projects')} aria-label={t('Back to all projects')}>
          <span className="brand-mark">
            <Leaf size={15} />
          </span>
        </button>
        <span className="project-name" title={doc.meta.name}>
          {doc.meta.name}
        </span>
        <MenuBar onHome={onHome} onHelp={onHelp} compact={compact} />
        {!compact && <span className="tool-sep" />}
        {!compact && toolbar}
        <span className="spacer" />
        {compact && <UndoRedo />}
        <button className="icon-btn" aria-label={t('Import blueprint image or PDF')} title={t('Import blueprint image or PDF')} onClick={() => window.dispatchEvent(new CustomEvent('gtk:import-blueprint'))}>
          <ImagePlus size={16} strokeWidth={1.75} absoluteStrokeWidth />
        </button>
        <ExportButton iconOnly={compact} />
        <AddPlantsButton iconOnly={compact} />
      </header>
      <nav className="worktabs" role="tablist" aria-label={t('Workspaces')}>
        {WORKSPACES.map((w) => (
          <button key={w.id} role="tab" aria-selected={workspace === w.id} onClick={() => useEditor.getState().setWorkspace(w.id)}>
            {w.icon}
            {t(w.label)}
          </button>
        ))}
      </nav>
      <TabGuardBanner />
      <main className="workspace" id="main-canvas">
        {workspace === 'design' && compact ? (
          <div className="mobile-design">
            <div className="mobile-canvas">
              <Canvas />
              {sheet && (
                <BottomSheet label={sheet === 'layers' ? t('Layers') : t('Details')} onClose={() => setSheet(null)}>
                  {sheet === 'layers' ? <LayersPanel /> : <Inspector />}
                </BottomSheet>
              )}
            </div>
            <div className="mobile-tools">
              <button className="btn sm mobile-sheet-btn" aria-pressed={sheet === 'layers'} onClick={() => setSheet(sheet === 'layers' ? null : 'layers')}>
                <LayersIcon size={16} strokeWidth={1.75} />
                <span>{t('Layers')}</span>
              </button>
              <div className="mobile-tools-scroll">{toolbar}</div>
              <DetailsButton active={sheet === 'details'} onClick={() => setSheet(sheet === 'details' ? null : 'details')} />
            </div>
          </div>
        ) : workspace === 'design' ? (
          <>
            {showLeft ? <LayersPanel /> : <div />}
            <Canvas />
            {showRight ? <Inspector /> : <div />}
          </>
        ) : (
          <div className="view" role="tabpanel">
            <Suspense fallback={<div className="view-inner muted">{t('Loading…')}</div>}>
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

function AddPlantsButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const plantable = doc ? selection.filter((id) => doc.objects[id] && kindInfo(doc.objects[id].kind).plantable) : [];
  return (
    <button
      className="btn primary sm"
      aria-label={iconOnly ? t('Add plants') : undefined}
      disabled={!plantable.length}
      title={plantable.length ? `Add plants to ${plantable.length} selected area(s)` : t('Select one or more beds or areas to add plants')}
      onClick={() => window.dispatchEvent(new CustomEvent('gtk:add-plants', { detail: { ids: plantable } }))}
    >
      <Sprout size={14} />
      {iconOnly ? (plantable.length > 1 ? plantable.length : null) : <>{t('Add plants')}{plantable.length > 1 ? ` (${plantable.length})` : ''}</>}
    </button>
  );
}


/** Always-visible export entry point (a project backup is the way to move a garden to another device). */
function ExportButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const doc = useEditor((s) => s.doc);
  if (!doc) return null;
  return (
    <MenuButton
      label={t('Export')}
      className={iconOnly ? 'icon-btn' : 'btn sm'}
      entries={() => [
        { type: 'label', label: t('Project backup (re-importable)') },
        { label: t('Project package (.gtkproject)'), onSelect: () => void exportProjectPackage(useEditor.getState().doc!) },
        { label: t('Single JSON file'), onSelect: () => void exportProjectJson(useEditor.getState().doc!, true) },
        { type: 'separator' },
        { label: t('PDF documents, plans & CSV…'), onSelect: () => useEditor.getState().setWorkspace('reports') },
      ]}
    >
      <Download size={iconOnly ? 16 : 14} strokeWidth={1.75} />
      {iconOnly ? <span className="sr-only">{t('Export')}</span> : t('Export')}
    </MenuButton>
  );
}

function UndoRedo() {
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  return (
    <>
      <button className="icon-btn" aria-label={t('Undo')} title={t('Undo')} disabled={!canUndo} onClick={() => useEditor.getState().undo()}>
        <Undo2 size={16} strokeWidth={1.75} absoluteStrokeWidth />
      </button>
      <button className="icon-btn" aria-label={t('Redo')} title={t('Redo')} disabled={!canRedo} onClick={() => useEditor.getState().redo()}>
        <Redo2 size={16} strokeWidth={1.75} absoluteStrokeWidth />
      </button>
    </>
  );
}

/** Opens the inspector sheet on phones; shows how many objects are selected. */
function DetailsButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const count = useEditor((s) => s.selection.length);
  return (
    <button className={count ? 'btn sm mobile-sheet-btn has-selection' : 'btn sm mobile-sheet-btn'} aria-pressed={active} onClick={onClick}>
      <PanelBottomOpen size={16} strokeWidth={1.75} />
      <span>{count ? `Details (${count})` : t('Details')}</span>
    </button>
  );
}

/** Phone bottom sheet holding a side panel over the lower part of the canvas. */
function BottomSheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <section className="bottom-sheet" role="region" aria-label={label}>
      <div className="bottom-sheet-grip" aria-hidden="true" />
      <button className="icon-btn bottom-sheet-close" aria-label={t('Close {{name}}', { name: label.toLowerCase() })} onClick={onClose}>
        <X size={18} strokeWidth={1.75} />
      </button>
      {children}
    </section>
  );
}
