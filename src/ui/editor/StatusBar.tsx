import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Magnet } from 'lucide-react';
import { shapeArea } from '../../domain/geometry';
import { formatArea, formatLength } from '../../domain/units';
import { useEditor, zoomPercent } from '../../editor/store';

export function StatusBar() {
  const { t } = useTranslation();
  const doc = useEditor((s) => s.doc);
  const view = useEditor((s) => s.view);
  const cursor = useEditor((s) => s.cursorWorld);
  const selection = useEditor((s) => s.selection);
  const saveStatus = useEditor((s) => s.saveStatus);
  const saveError = useEditor((s) => s.saveError);
  const snapping = useEditor((s) => s.snapping);
  const flash = useEditor((s) => s.flash);
  const [showFlash, setShowFlash] = useState(false);
  useEffect(() => {
    if (!flash) return;
    setShowFlash(true);
    const t = setTimeout(() => setShowFlash(false), 3500);
    return () => clearTimeout(t);
  }, [flash]);
  if (!doc) return null;
  const units = doc.settings.unitSystem;
  const selArea = selection.reduce((s, id) => s + (doc.objects[id] ? shapeArea(doc.objects[id].shape) : 0), 0);
  const uncalibrated = doc.backgrounds.length > 0 && doc.backgrounds.every((b) => !b.calibration);
  const saveText =
    saveStatus === 'saved' ? t('Saved locally') : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'pending' ? 'Unsaved changes' : `Save failed: ${saveError ?? ''}`;
  return (
    <footer className="statusbar" aria-label="Status">
      <span role="status" aria-live="polite" title={saveStatus === 'error' ? saveError ?? '' : 'Your project is stored in this browser (IndexedDB)'}>
        <span className={`save-dot ${saveStatus}`} />
        {saveText}
      </span>
      <span className="status-sep st-optional" />
      <span className="num st-optional" title="Cursor position in real-world units (origin at the red cross)">
        {cursor ? `X ${formatLength(cursor.x, units, units === 'metric' ? 'm' : undefined)}  Y ${formatLength(cursor.y, units, units === 'metric' ? 'm' : undefined)}` : 'X —  Y —'}
      </span>
      <span className="status-sep" />
      <span className="num" title="Zoom never changes object dimensions; 100% = 1 m per 100 screen pixels">
        Zoom {zoomPercent(view)}%<span className="st-optional"> · 1 m = {(view.scale * 1000).toFixed(view.scale * 1000 < 10 ? 1 : 0)} px</span>
      </span>
      <span className="status-sep st-optional" />
      <span className="st-optional" title={`All dimensions are real-world measurements (${units === 'metric' ? 'metres, centimetres, square metres' : 'feet, inches, square feet'})`}>{units === 'metric' ? 'Metric' : 'Imperial'}</span>
      {uncalibrated && (
        <span className="badge warn dot" title="Use the Calibrate tool (K) to set the blueprint's real scale">
          Scale not calibrated
        </span>
      )}
      {selection.length > 0 && (
        <span className="num">
          {selection.length} selected{selArea > 0 ? ` · ${formatArea(selArea, units)}` : ''}
        </span>
      )}
      <span className="spacer" />
      {showFlash && flash && (flash.kind === 'error' ? <span className="badge danger">{flash.text}</span> : <span>{flash.text}</span>)}
      <button
        className={snapping ? 'on' : ''}
        aria-pressed={snapping}
        title="Snapping on/off (hold Ctrl/⌘ while dragging to bypass temporarily)"
        onClick={() => useEditor.getState().setSnapping(!snapping)}
      >
        <Magnet size={11} style={{ verticalAlign: -1 }} /> Snap {snapping ? 'on' : 'off'}
      </button>
      <span className="num st-optional">Grid {formatLength(doc.settings.gridSizeMm, units)}</span>
    </footer>
  );
}
