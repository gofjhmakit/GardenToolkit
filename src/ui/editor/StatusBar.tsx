import { useEffect, useState } from 'react';
import { Magnet } from 'lucide-react';
import { shapeArea } from '../../domain/geometry';
import { formatArea, formatLength } from '../../domain/units';
import { useEditor, zoomPercent } from '../../editor/store';
import { t, tn } from '../../i18n';

export function StatusBar() {
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
    saveStatus === 'saved' ? t('Saved locally') : saveStatus === 'saving' ? t('Saving…') : saveStatus === 'pending' ? t('Unsaved changes') : t('Save failed: {{error}}', { error: saveError ?? '' });
  return (
    <footer className="statusbar" aria-label={t('Status')}>
      <span role="status" aria-live="polite" title={saveStatus === 'error' ? saveError ?? '' : t('Your project is stored in this browser (IndexedDB)')}>
        <span className={`save-dot ${saveStatus}`} />
        {saveText}
      </span>
      <span className="status-sep st-optional" />
      <span className="num st-optional" title={t('Cursor position in real-world units (origin at the red cross)')}>
        {cursor ? `X ${formatLength(cursor.x, units, units === 'metric' ? 'm' : undefined)}  Y ${formatLength(cursor.y, units, units === 'metric' ? 'm' : undefined)}` : 'X —  Y —'}
      </span>
      <span className="status-sep" />
      <span className="num" title={t('Zoom never changes object dimensions; 100% = 1 m per 100 screen pixels')}>
        {t('Zoom {{pct}}%', { pct: zoomPercent(view) })}<span className="st-optional"> · 1 m = {(view.scale * 1000).toFixed(view.scale * 1000 < 10 ? 1 : 0)} px</span>
      </span>
      <span className="status-sep st-optional" />
      <span className="st-optional" title={units === 'metric' ? t('All dimensions are real-world measurements (metres, centimetres, square metres)') : t('All dimensions are real-world measurements (feet, inches, square feet)')}>{units === 'metric' ? t('Metric') : t('Imperial')}</span>
      {uncalibrated && (
        <span className="badge warn dot" title={t('Use the Calibrate tool (K) to set the blueprint\'s real scale')}>
          {t('Scale not calibrated')}
        </span>
      )}
      {selection.length > 0 && (
        <span className="num">
          {tn('{{count}} selected', selection.length)}{selArea > 0 ? ` · ${formatArea(selArea, units)}` : ''}
        </span>
      )}
      <span className="spacer" />
      {showFlash && flash && (flash.kind === 'error' ? <span className="badge danger">{flash.text}</span> : <span>{flash.text}</span>)}
      <button
        className={snapping ? 'on' : ''}
        aria-pressed={snapping}
        title={t('Snapping on/off (hold Ctrl/⌘ while dragging to bypass temporarily)')}
        onClick={() => useEditor.getState().setSnapping(!snapping)}
      >
        <Magnet size={11} style={{ verticalAlign: -1 }} /> {snapping ? t('Snap on') : t('Snap off')}
      </button>
      <span className="num st-optional">{t('Grid {{size}}', { size: formatLength(doc.settings.gridSizeMm, units) })}</span>
    </footer>
  );
}
