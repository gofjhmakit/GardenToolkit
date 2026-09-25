import { useState } from 'react';
import { dist, type Vec } from '../../domain/geometry';
import { formatLength, parseLength } from '../../domain/units';
import { calibrateBackground } from '../../editor/commands';
import { useEditor } from '../../editor/store';
import { Dialog } from '../components/Dialog';
import { Checkbox } from '../components/Fields';

export function CalibrateDialog({ bgId, a, b, onClose }: { bgId: string; a: Vec; b: Vec; onClose: () => void }) {
  const doc = useEditor((s) => s.doc)!;
  const bg = doc.backgrounds.find((x) => x.id === bgId);
  const objectCount = Object.keys(doc.objects).length;
  const [text, setText] = useState('');
  const [scaleObjects, setScaleObjects] = useState(objectCount > 0 && !bg?.calibration);
  const measured = dist(a, b);
  const parsed = parseLength(text, doc.settings.unitSystem === 'imperial' ? 'ft' : 'm');
  const valid = parsed != null && parsed > 0;
  const apply = () => {
    if (!valid || !bg) return;
    useEditor.getState().commit('Calibrate blueprint scale', (d) => {
      calibrateBackground(d, bgId, a, b, parsed!, { scaleObjects });
    });
    useEditor.getState().showFlash(`Scale calibrated: ${formatLength(parsed!)} between the reference points.`);
    onClose();
  };
  return (
    <Dialog
      open
      title="Calibrate blueprint scale"
      onClose={onClose}
      initialFocus="calib-distance"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!valid} onClick={apply}>
            Apply scale
          </button>
        </>
      }
    >
      <form
        className="col"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <p>
          Enter the real-world distance between the two points you clicked on <strong>{bg?.name ?? 'the blueprint'}</strong>.
        </p>
        <p className="muted small">Currently measured on the plan: {formatLength(measured, doc.settings.unitSystem)} (under the present scale assumption).</p>
        <div className="field">
          <label htmlFor="calib-distance">Real distance</label>
          <input
            id="calib-distance"
            className="input"
            placeholder="e.g. 10 m, 850 cm, 32 ft"
            value={text}
            aria-invalid={text !== '' && !valid}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="hint">A bare number is read as {doc.settings.unitSystem === 'imperial' ? 'feet' : 'metres'}. Longer reference distances give more accurate results.</div>
        </div>
        {valid && <p className="small">The image will be scaled by ×{(parsed! / measured).toFixed(4)}.</p>}
        {objectCount > 0 && (
          <Checkbox
            checked={scaleObjects}
            onChange={setScaleObjects}
            label={`Also rescale the ${objectCount} existing object${objectCount === 1 ? '' : 's'} drawn on this plan`}
          />
        )}
      </form>
    </Dialog>
  );
}
