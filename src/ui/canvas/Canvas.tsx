import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Maximize, Minus, Plus, Scan } from 'lucide-react';
import { add, dimensionNormal, dist, localToWorld, rotate, scale as vscale, shapeOutline, type Vec } from '../../domain/geometry';
import { kindInfo } from '../../domain/objectKinds';
import { isObjectLocked } from '../../domain/projectFactory';
import { formatLength } from '../../domain/units';
import { useEditor, zoomPercent, type View } from '../../editor/store';
import { usePrefs } from '../../app/prefs';
import { usePlantLookup } from '../../app/lookup';
import { imagePxToWorld } from '../../editor/commands';
import { Patterns } from './Patterns';
import { ObjectLayer, objectTransform } from './ObjectLayer';
import { AnnotationLayer, Backgrounds, Grid, Rulers, ScaleBar, RULER } from './Layers2D';
import { CanvasInteraction, HANDLE_PX, rotateHandleScreen, vertexPoints, type OverlayState } from './interaction';
import { frameCorners, handleWorld, selectionFrame } from './frame';
import { CalibrateDialog } from './CalibrateDialog';
import { requestTextFocus } from '../panels/ObjectInspector';
import { TouchController } from './touch';
import { useCoarsePointer } from '../useCompact';

/** Shorter hints for touch screens (no keyboard, no hover). */
const TOUCH_HINTS: Record<string, string> = {
  select: 'Tap to select · Drag to move · Two fingers to pan & zoom · Long-press for actions',
  hand: 'Drag to pan · Pinch to zoom',
  rect: 'Drag to draw · Tap for default size',
  ellipse: 'Drag to draw',
  polygon: 'Tap to add points · Tap the first point or Finish to close',
  polyline: 'Tap to add points · Double-tap or Finish to end',
  text: 'Tap to place a text label',
  dimension: 'Tap the start and end points',
  tree: 'Tap to place a tree · Drag to set the canopy',
  shrub: 'Tap to place a shrub · Drag to set its width',
  calibrate: 'Tap two points whose real distance you know',
};

const TOOL_HINTS: Record<string, string> = {
  select: 'Click to select · Shift/Ctrl-click to add · Drag to move (Alt-drag duplicates) · Double-click a polygon to edit points',
  hand: 'Drag to pan · Scroll to zoom',
  rect: 'Drag to draw · Shift = square · Alt = from centre · Click for default size',
  ellipse: 'Drag to draw · Shift = circle · Alt = from centre',
  polygon: 'Click to add points · Click the first point, double-click or Enter to finish · Backspace removes a point · Esc cancels',
  polyline: 'Click to add points · Double-click or Enter to finish · Shift = 15° angles',
  freehand: 'Drag to draw a freeform outline',
  text: 'Click to place a text label',
  dimension: 'Click the start and end points · Shift = 15° angles',
  measure: 'Drag to measure a distance (not saved)',
  tree: 'Click to place a tree · Drag to set the canopy radius',
  shrub: 'Click to place a shrub · Drag to set its width',
  calibrate: 'Click two points on the blueprint whose real distance you know',
};

export function Canvas() {
  const doc = useEditor((s) => s.doc);
  const view = useEditor((s) => s.view);
  const viewport = useEditor((s) => s.viewport);
  const selection = useEditor((s) => s.selection);
  const tool = useEditor((s) => s.tool);
  const vertexEditId = useEditor((s) => s.vertexEditId);
  const cursorWorld = useEditor((s) => s.cursorWorld);
  const selectedBackgroundId = useEditor((s) => s.selectedBackgroundId);
  const lookup = usePlantLookup();
  const wheelMode = usePrefs((s) => s.wheel);
  const coarse = useCoarsePointer();

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [overlay, setOverlayState] = useState<OverlayState>({ draft: null, guides: [], hoverId: null, snapPoint: null });
  const overlayRef = useRef(overlay);
  const spaceDown = useRef(false);
  const [cursor, setCursor] = useState('default');
  const [calib, setCalib] = useState<{ bgId: string; a: Vec; b: Vec } | null>(null);

  const setOverlay = useCallback((o: Partial<OverlayState>) => {
    overlayRef.current = { ...overlayRef.current, ...o };
    setOverlayState(overlayRef.current);
  }, []);

  const interaction = useMemo(
    () =>
      new CanvasInteraction({
        getSvgRect: () => svgRef.current!.getBoundingClientRect(),
        setOverlay,
        getOverlay: () => overlayRef.current,
        requestCalibration: (bgId, a, b) => setCalib({ bgId, a, b }),
        onTextCreated: (id) => requestTextFocus(id),
        isSpaceDown: () => spaceDown.current,
      }),
    [setOverlay],
  );

  const touch = useMemo(() => new TouchController(interaction, () => svgRef.current!.getBoundingClientRect()), [interaction]);
  useEffect(() => () => touch.dispose(), [touch]);

  // Viewport size.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      useEditor.getState().setViewport(r.width, r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset pending drawings when the tool changes.
  useEffect(() => {
    interaction.reset();
  }, [tool, interaction]);

  // Space-to-pan and Escape/Enter/Backspace for drawing tools.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const editable = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (editable) return;
      if (e.code === 'Space' && !e.repeat) {
        spaceDown.current = true;
        setCursor('grab');
        e.preventDefault();
      }
      if (useEditor.getState().workspace !== 'design') return;
      if (interaction.key(e)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false;
        setCursor('default');
      }
    };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up);
    };
  }, [interaction]);

  // Wheel: zoom (or pan, per preference); pinch-zoom arrives as ctrl+wheel.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top };
      const s = useEditor.getState();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const dx = e.deltaMode === 1 ? e.deltaX * 16 : e.deltaX;
      const zoom = e.ctrlKey || e.metaKey || (usePrefs.getState().wheel === 'zoom' && !e.shiftKey);
      if (zoom) {
        s.zoomAt(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), p);
      } else {
        s.setView({ ...s.view, x: s.view.x - (e.shiftKey ? dy : dx), y: s.view.y - (e.shiftKey ? 0 : dy) });
      }
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [wheelMode]);

  if (!doc) return null;

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    svgRef.current?.focus({ preventScroll: true });
    if (e.pointerType === 'touch') {
      touch.down(e.nativeEvent);
      return;
    }
    interaction.pointerDown(e.nativeEvent);
    setCursor(interaction.cursorFor(e));
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      touch.move(e.nativeEvent);
      return;
    }
    interaction.pointerMove(e.nativeEvent);
    const c = interaction.cursorFor(e);
    if (c !== cursor) setCursor(c);
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') {
      touch.up(e.nativeEvent);
      return;
    }
    interaction.pointerUp(e.nativeEvent);
    setCursor(interaction.cursorFor(e));
  };

  const selSet = new Set(selection);
  const worldTransform = `matrix(${view.scale} 0 0 ${view.scale} ${view.x} ${view.y})`;
  // The welcome card only shows with the Select tool so it never blocks drawing.
  const isEmpty = Object.keys(doc.objects).length === 0 && doc.backgrounds.length === 0 && tool === 'select';
  const hint = (coarse ? TOUCH_HINTS[tool] : undefined) ?? TOOL_HINTS[tool];
  const pendingMulti = (tool === 'polygon' || tool === 'polyline') && overlay.draft?.kind === 'polygon' && interaction.hasPendingDrawing();

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        className="canvas-svg"
        role="application"
        aria-label="Garden design canvas. Use the Layers panel and Inspector for keyboard access to objects."
        aria-roledescription="drawing canvas"
        tabIndex={0}
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => useEditor.getState().setCursorWorld(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('gtk:context-menu', { detail: { x: e.clientX, y: e.clientY } }));
        }}
        onDoubleClick={() => {
          if (interaction.hasPendingDrawing() && (tool === 'polygon' || tool === 'polyline')) interaction.finishPolygon();
        }}
      >
        <Patterns />
        {doc.settings.showGrid && <Grid view={view} width={viewport.width} height={viewport.height} gridMm={doc.settings.gridSizeMm} />}
        <g transform={worldTransform}>
          <Backgrounds doc={doc} />
          <ObjectLayer doc={doc} lookup={lookup} />
        </g>
        <AnnotationLayer doc={doc} view={view} lookup={lookup} selection={selSet} />
        <SelectionOverlay view={view} hoverId={overlay.hoverId} vertexEditId={vertexEditId} selectedBackgroundId={selectedBackgroundId} />
        <DraftOverlay overlay={overlay} view={view} />
        {doc.settings.showRulers && <Rulers view={view} width={viewport.width} height={viewport.height} cursor={cursorWorld} />}
        <ScaleBar view={view} height={viewport.height} />
      </svg>
      {isEmpty && (
        <div className="canvas-empty">
          <div className="card col">
            <div className="empty-state-icon" style={{ alignSelf: 'center' }}>
              <ImagePlus size={20} />
            </div>
            <h2>Start your garden plan</h2>
            <p className="muted">Import a site plan or aerial photo and calibrate its scale, or start drawing beds directly — everything is measured in real-world units.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn primary" onClick={() => window.dispatchEvent(new CustomEvent('gtk:import-blueprint'))}>
                Import blueprint…
              </button>
              <button className="btn" onClick={() => useEditor.getState().setTool('rect', 'bed')}>
                Draw a bed
              </button>
            </div>
            <button className="btn ghost sm" style={{ alignSelf: 'center' }} onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}>
              Keyboard shortcuts (?)
            </button>
          </div>
        </div>
      )}
      {hint && !isEmpty && !pendingMulti && <div className="canvas-hint">{hint}</div>}
      {pendingMulti && (
        <div className="draw-actions" role="group" aria-label="Drawing">
          <button className="btn sm" onClick={() => interaction.reset()}>
            Cancel
          </button>
          <button className="btn primary sm" onClick={() => interaction.finishPolygon()}>
            Finish shape
          </button>
        </div>
      )}
      <div className="zoom-controls" role="group" aria-label="Zoom">
        <button className="icon-btn sm" title="Zoom out" aria-label="Zoom out" onClick={() => useEditor.getState().zoomAt(1 / 1.25, { x: viewport.width / 2, y: viewport.height / 2 })}>
          <Minus size={14} />
        </button>
        <button className="btn ghost sm num" style={{ minWidth: 52 }} title="Reset zoom to 100% (1 m = 100 px)" onClick={() => useEditor.getState().zoomAt(0.1 / view.scale, { x: viewport.width / 2, y: viewport.height / 2 })}>
          {zoomPercent(view)}%
        </button>
        <button className="icon-btn sm" title="Zoom in" aria-label="Zoom in" onClick={() => useEditor.getState().zoomAt(1.25, { x: viewport.width / 2, y: viewport.height / 2 })}>
          <Plus size={14} />
        </button>
        <button className="icon-btn sm" title="Fit to screen (Shift+1)" aria-label="Fit to screen" onClick={() => useEditor.getState().fitToContent()}>
          <Maximize size={14} />
        </button>
        <button className="icon-btn sm" title="Zoom to selection (Shift+2)" aria-label="Zoom to selection" disabled={!selection.length} onClick={() => useEditor.getState().zoomToSelection()}>
          <Scan size={14} />
        </button>
      </div>
      {calib && <CalibrateDialog bgId={calib.bgId} a={calib.a} b={calib.b} onClose={() => setCalib(null)} />}
    </div>
  );
}

function SelectionOverlay({ view, hoverId, vertexEditId, selectedBackgroundId }: { view: View; hoverId: string | null; vertexEditId: string | null; selectedBackgroundId: string | null }) {
  const doc = useEditor((s) => s.doc)!;
  const selection = useEditor((s) => s.selection);
  const gesture = useEditor((s) => s.gesture);
  const toS = (p: Vec) => ({ x: p.x * view.scale + view.x, y: p.y * view.scale + view.y });
  const pts = (ws: Vec[]) => ws.map((p) => { const s = toS(p); return `${s.x},${s.y}`; }).join(' ');
  const els: React.ReactNode[] = [];
  const outline = (id: string, color: string, width: number, dash?: string) => {
    const o = doc.objects[id];
    if (!o) return null;
    if (o.shape.type === 'dimension') {
      const n = dimensionNormal(o.shape.a, o.shape.b);
      const off = vscale(n, o.shape.offset);
      const a = localToWorld(o.transform, add(o.shape.a, off));
      const b = localToWorld(o.transform, add(o.shape.b, off));
      return <polyline key={`o-${id}`} points={pts([a, b])} fill="none" stroke={color} strokeWidth={width + 2} strokeOpacity={0.4} />;
    }
    const outlinePts = shapeOutline(o.shape, 48).map((p) => localToWorld(o.transform, p));
    const closed = o.shape.type !== 'polyline';
    return closed ? (
      <polygon key={`o-${id}`} points={pts(outlinePts)} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} />
    ) : (
      <polyline key={`o-${id}`} points={pts(outlinePts)} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} />
    );
  };
  if (hoverId && !selection.includes(hoverId)) els.push(outline(hoverId, 'var(--cv-select)', 1));
  for (const id of selection) els.push(outline(id, 'var(--cv-select)', 1.5));

  // Background selection frame
  if (selectedBackgroundId) {
    const bg = doc.backgrounds.find((b) => b.id === selectedBackgroundId);
    if (bg) {
      const c = bg.crop ?? { x: 0, y: 0, width: bg.naturalWidth, height: bg.naturalHeight };
      const corners = [
        { x: c.x, y: c.y },
        { x: c.x + c.width, y: c.y },
        { x: c.x + c.width, y: c.y + c.height },
        { x: c.x, y: c.y + c.height },
      ].map((p) => imagePxToWorld(bg, p));
      els.push(<polygon key="bg-frame" points={pts(corners)} fill="none" stroke="var(--cv-origin)" strokeWidth={1.5} strokeDasharray={bg.locked ? '6 4' : undefined} />);
    }
  }

  const frame = selectionFrame(doc, selection);
  const locked = selection.some((id) => doc.objects[id] && isObjectLocked(doc, doc.objects[id]));
  const single = selection.length === 1 ? doc.objects[selection[0]] : null;
  const vertexMode = single && (vertexEditId === single.id || single.shape.type === 'dimension' || (single.shape.type === 'polyline' && single.shape.points.length === 2));
  if (frame && !vertexMode) {
    if (selection.length > 1 || single?.shape.type === 'text' || gesture) {
      els.push(<polygon key="frame" points={pts(frameCorners(frame))} fill="none" stroke="var(--cv-select)" strokeWidth={1} strokeDasharray="4 3" />);
    }
    if (!locked) {
      const top = toS(handleWorld(frame, 1));
      const rh = rotateHandleScreen(frame, view);
      els.push(<line key="rot-line" x1={top.x} y1={top.y} x2={rh.x} y2={rh.y} stroke="var(--cv-select)" />);
      els.push(<circle key="rot" cx={rh.x} cy={rh.y} r={HANDLE_PX / 2 + 1} fill="var(--cv-halo)" stroke="var(--cv-select)" strokeWidth={1.5} />);
      for (let i = 0; i < 8; i++) {
        const s = toS(handleWorld(frame, i));
        els.push(<rect key={`h${i}`} x={s.x - HANDLE_PX / 2} y={s.y - HANDLE_PX / 2} width={HANDLE_PX} height={HANDLE_PX} fill="var(--cv-halo)" stroke="var(--cv-select)" strokeWidth={1.5} />);
      }
    }
    // Live dimensions while transforming or for a single selection
    if (single && (single.shape.type === 'rect' || single.shape.type === 'ellipse')) {
      const w = single.shape.type === 'rect' ? single.shape.width : single.shape.rx * 2;
      const h = single.shape.type === 'rect' ? single.shape.height : single.shape.ry * 2;
      const bottom = toS(handleWorld(frame, 5));
      const label = `${formatLength(w, doc.settings.unitSystem)} × ${formatLength(h, doc.settings.unitSystem)}`;
      const off = rotate({ x: 0, y: 16 }, frame.rotation);
      els.push(
        <g key="dims" transform={`translate(${bottom.x + off.x} ${bottom.y + off.y})`}>
          <rect x={-label.length * 3.3 - 6} y={-9} width={label.length * 6.6 + 12} height={18} rx={9} fill="var(--cv-select)" />
          <text textAnchor="middle" dominantBaseline="central" fontSize={11} fill="var(--cv-halo)" fontWeight={600}>
            {label}
          </text>
        </g>,
      );
    }
  }
  if (single && vertexMode && !locked) {
    const pts2 = vertexPoints(single, vertexEditId === single.id);
    pts2.forEach((p, i) => {
      const s = toS(localToWorld(single.transform, p));
      els.push(<rect key={`v${i}`} x={s.x - 4.5} y={s.y - 4.5} width={9} height={9} rx={2} fill="var(--cv-halo)" stroke="var(--cv-origin)" strokeWidth={1.5} />);
    });
  }
  return <g pointerEvents="none">{els}</g>;
}

function DraftOverlay({ overlay, view }: { overlay: OverlayState; view: View }) {
  const unitSystem = useEditor((s) => s.doc?.settings.unitSystem ?? 'metric');
  const toS = (p: Vec) => ({ x: p.x * view.scale + view.x, y: p.y * view.scale + view.y });
  const els: React.ReactNode[] = [];
  const d = overlay.draft;
  if (d?.kind === 'marquee') {
    const a = toS(d.a);
    const b = toS(d.b);
    els.push(<rect key="m" x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} fill="var(--cv-select-fill)" stroke="var(--cv-select)" strokeDasharray="4 3" />);
  }
  if (d?.kind === 'shape') {
    const info = kindInfo(d.objKind);
    const o = { transform: d.transform, shape: d.shape };
    els.push(
      <g key="s" transform={`matrix(${view.scale} 0 0 ${view.scale} ${view.x} ${view.y})`}>
        <g transform={objectTransform(o as never)}>
          {d.shape.type === 'rect' && <rect x={-d.shape.width / 2} y={-d.shape.height / 2} width={d.shape.width} height={d.shape.height} fill={info.fill} fillOpacity={0.5} stroke={info.stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
          {d.shape.type === 'ellipse' && <ellipse rx={d.shape.rx} ry={d.shape.ry} fill={info.fill} fillOpacity={0.5} stroke={info.stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
        </g>
      </g>,
    );
    const c = toS({ x: d.transform.x, y: d.transform.y });
    els.push(<Tag key="t" x={c.x} y={c.y} text={d.label} />);
  }
  if (d?.kind === 'polygon') {
    const all = d.cursor ? [...d.points, d.cursor] : d.points;
    const s = all.map(toS);
    const info = kindInfo(d.objKind);
    els.push(<polyline key="p" points={s.map((p) => `${p.x},${p.y}`).join(' ')} fill={d.closed && s.length > 2 ? info.fill : 'none'} fillOpacity={0.35} stroke={info.stroke === 'none' ? '#333' : info.stroke} strokeWidth={1.5} />);
    if (d.closed && s.length > 2) els.push(<line key="close" x1={s[s.length - 1].x} y1={s[s.length - 1].y} x2={s[0].x} y2={s[0].y} stroke="#999" strokeDasharray="3 3" />);
    d.points.forEach((p, i) => {
      const q = toS(p);
      els.push(<circle key={`pt${i}`} cx={q.x} cy={q.y} r={i === 0 ? 5 : 3} fill="var(--cv-halo)" stroke="var(--cv-select)" strokeWidth={1.5} />);
    });
    if (d.cursor && d.points.length) {
      const last = d.points[d.points.length - 1];
      const q = toS(d.cursor);
      els.push(<Tag key="len" x={q.x + 14} y={q.y + 14} text={formatLength(dist(last, d.cursor), unitSystem)} anchor="start" />);
    }
  }
  if (d?.kind === 'measure' || d?.kind === 'calibrate') {
    const a = toS(d.a);
    const b = d.b ? toS(d.b) : a;
    const color = d.kind === 'calibrate' ? 'var(--cv-origin)' : 'var(--cv-select)';
    els.push(<line key="ml" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={2} strokeDasharray={d.kind === 'calibrate' ? '6 3' : undefined} />);
    els.push(<circle key="ma" cx={a.x} cy={a.y} r={4} fill="var(--cv-halo)" stroke={color} strokeWidth={2} />);
    if (d.b) {
      els.push(<circle key="mb" cx={b.x} cy={b.y} r={4} fill="var(--cv-halo)" stroke={color} strokeWidth={2} />);
      const text = d.kind === 'calibrate' ? `Current: ${formatLength(dist(d.a, d.b), unitSystem)}` : formatLength(dist(d.a, d.b), unitSystem);
      els.push(<Tag key="mt" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 14} text={text} />);
    }
  }
  for (const [i, g] of overlay.guides.entries()) {
    if (g.axis === 'x') {
      const a = toS({ x: g.value, y: g.from });
      const b = toS({ x: g.value, y: g.to });
      els.push(<line key={`g${i}`} x1={a.x} y1={a.y - 8} x2={b.x} y2={b.y + 8} stroke="var(--cv-snap)" strokeWidth={1} />);
    } else {
      const a = toS({ x: g.from, y: g.value });
      const b = toS({ x: g.to, y: g.value });
      els.push(<line key={`g${i}`} x1={a.x - 8} y1={a.y} x2={b.x + 8} y2={b.y} stroke="var(--cv-snap)" strokeWidth={1} />);
    }
  }
  if (overlay.snapPoint) {
    const s = toS(overlay.snapPoint);
    els.push(<rect key="sp" x={s.x - 4} y={s.y - 4} width={8} height={8} fill="none" stroke="var(--cv-snap)" strokeWidth={1.5} />);
  }
  return <g pointerEvents="none">{els}</g>;
}

function Tag({ x, y, text, anchor = 'middle' }: { x: number; y: number; text: string; anchor?: 'middle' | 'start' }) {
  const w = text.length * 6.6 + 12;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={anchor === 'middle' ? -w / 2 : 0} y={-9} width={w} height={18} rx={9} fill="var(--cv-ink)" fillOpacity={0.85} />
      <text x={anchor === 'middle' ? 0 : 6} textAnchor={anchor} dominantBaseline="central" fontSize={11} fill="var(--cv-halo)">
        {text}
      </text>
    </g>
  );
}

export { RULER };
