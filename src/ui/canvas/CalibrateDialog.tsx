import { useState } from 'react';
import { dist, type Vec } from '../../domain/geometry';
import { formatLength, formatNumber, parseLength } from '../../domain/units';
import { calibrateBackground } from '../../editor/commands';
import { useEditor } from '../../editor/store';
import { Dialog } from '../components/Dialog';
import { Checkbox } from '../components/Fields';
import { t, tn } from '../../i18n';

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
    useEditor.getState().showFlash(t('Scale calibrated: {{length}} between the reference points.', { length: formatLength(parsed!) }));
    onClose();
  };
  return (
    <Dialog
      open
      title={t('Calibrate blueprint scale')}
      onClose={onClose}
      initialFocus="calib-distance"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {t('Cancel')}
          </button>
          <button className="btn primary" disabled={!valid} onClick={apply}>
            {t('Apply scale')}
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
          {t('Enter the real-world distance between the two points you clicked on {{name}}.', { name: bg?.name ?? t('the blueprint') })}
        </p>
        <p className="muted small">{t('Currently measured on the plan: {{length}} (under the present scale assumption).', { length: formatLength(measured, doc.settings.unitSystem) })}</p>
        <div className="field">
          <label htmlFor="calib-distance">{t('Real distance')}</label>
          <input
            id="calib-distance"
            className="input"
            placeholder={t('e.g. 10 m, 850 cm, 32 ft')}
            value={text}
            aria-invalid={text !== '' && !valid}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="hint">{doc.settings.unitSystem === 'imperial' ? t('A bare number is read as feet. Longer reference distances give more accurate results.') : t('A bare number is read as metres. Longer reference distances give more accurate results.')}</div>
        </div>
        {valid && <p className="small">{t('The image will be scaled by ×{{factor}}.', { factor: formatNumber(parsed! / measured, 4) })}</p>}
        {objectCount > 0 && (
          <Checkbox
            checked={scaleObjects}
            onChange={setScaleObjects}
            label={tn('Also rescale the {{count}} existing objects drawn on this plan', objectCount)}
          />
        )}
      </form>
    </Dialog>
  );
}
