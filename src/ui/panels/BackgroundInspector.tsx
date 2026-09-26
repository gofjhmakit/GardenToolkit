import { useState } from 'react';
import { Crop, Scale, Trash2 } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { removeBackground, updateBackground } from '../../editor/commands';
import { formatLength, inputUnit } from '../../domain/units';
import { Checkbox, Field, LengthInput, NumberInput } from '../components/Fields';
import { Dialog } from '../components/Dialog';
import type { BackgroundImage } from '../../domain/project';
import { useAssetUrl } from '../../app/assets';
import { locale, t } from '../../i18n';

export function BackgroundInspector({ id }: { id: string }) {
  const doc = useEditor((s) => s.doc)!;
  const bg = doc.backgrounds.find((b) => b.id === id);
  const [cropOpen, setCropOpen] = useState(false);
  if (!bg) return null;
  const units = doc.settings.unitSystem;
  const big = inputUnit(units, 'large');
  const commit = (label: string, patch: Partial<Omit<BackgroundImage, 'id'>>, key?: string) =>
    useEditor.getState().commit(label, (d) => updateBackground(d, id, patch), key ? { coalesceKey: `${key}:${id}` } : undefined);
  const widthMm = bg.naturalWidth * bg.mmPerPx;
  return (
    <div>
      <div className="section">
        <strong>{bg.name}</strong>
        <div className="small muted">
          {t('{{w}} × {{h}} px · covers {{width}} × {{height}}', { w: bg.naturalWidth, h: bg.naturalHeight, width: formatLength(widthMm, units), height: formatLength(bg.naturalHeight * bg.mmPerPx, units) })}
        </div>
        {bg.calibration ? (
          <div className="callout ok">
            <Scale size={14} />
            <span>
              {t('Calibrated: 1 px = {{scale}} (reference {{distance}}, {{date}})', { scale: formatLength(bg.mmPerPx, units), distance: formatLength(bg.calibration.distanceMm, units), date: new Date(bg.calibration.calibratedAt).toLocaleDateString(locale()) })}
            </span>
          </div>
        ) : (
          <div className="callout warn">
            <Scale size={14} />
            <span>{t('Not calibrated yet — the scale is an assumption. Use Calibrate and click two points with a known distance.')}</span>
          </div>
        )}
        <div className="row wrap">
          <button className="btn sm primary" onClick={() => useEditor.getState().setTool('calibrate')}>
            <Scale size={13} />{' '}{t('Calibrate scale')}
          </button>
          <button className="btn sm" onClick={() => setCropOpen(true)}>
            <Crop size={13} />{' '}{t('Crop…')}
          </button>
          <button className="btn sm danger" disabled={bg.locked} onClick={() => {
            useEditor.getState().commit('Remove blueprint', (d) => removeBackground(d, id));
            useEditor.getState().selectBackground(null);
          }}>
            <Trash2 size={13} />{' '}{t('Remove')}
          </button>
        </div>
      </div>
      <div className="section">
        <h4>{t('Display')}</h4>
        <Field label={t('Opacity {{pct}}%', { pct: Math.round(bg.opacity * 100) })}>
          {(fid) => <input id={fid} type="range" min={0.05} max={1} step={0.05} value={bg.opacity} onChange={(e) => commit('Opacity', { opacity: Number(e.target.value) }, 'opacity')} />}
        </Field>
        <Checkbox checked={bg.visible} onChange={(v) => commit(v ? 'Show blueprint' : 'Hide blueprint', { visible: v })} label={t('Visible')} />
        <Checkbox checked={bg.locked} onChange={(v) => commit(v ? 'Lock blueprint' : 'Unlock blueprint', { locked: v })} label={t('Locked (prevents accidental moves)')} />
      </div>
      <div className="section">
        <h4>{t('Position & orientation')}</h4>
        <div className="grid2">
          <Field label={t('Centre X')}>{(fid) => <LengthInput id={fid} unit={big} valueMm={bg.transform.x} min={-1e12} disabled={bg.locked} onCommit={(v) => v != null && commit('Move blueprint', { transform: { ...bg.transform, x: v } })} />}</Field>
          <Field label={t('Centre Y')}>{(fid) => <LengthInput id={fid} unit={big} valueMm={bg.transform.y} min={-1e12} disabled={bg.locked} onCommit={(v) => v != null && commit('Move blueprint', { transform: { ...bg.transform, y: v } })} />}</Field>
          <Field label={t('Rotation')}>{(fid) => <NumberInput id={fid} value={bg.transform.rotation} suffix="°" min={-360} max={360} disabled={bg.locked} onCommit={(v) => v != null && commit('Rotate blueprint', { transform: { ...bg.transform, rotation: v } })} />}</Field>
          <Field label={t('Image width')} hint={t('Resizes the image (prefer Calibrate)')}>
            {(fid) => <LengthInput id={fid} unit={big} valueMm={widthMm} min={10} disabled={bg.locked} onCommit={(v) => v && commit('Resize blueprint', { mmPerPx: v / bg.naturalWidth })} />}
          </Field>
        </div>
        <p className="tiny muted">{t('Unlock the image, select it, then drag it on the canvas or use the arrow keys to position it.')}</p>
      </div>
      {cropOpen && <CropDialog bg={bg} onClose={() => setCropOpen(false)} />}
    </div>
  );
}

function CropDialog({ bg, onClose }: { bg: BackgroundImage; onClose: () => void }) {
  const url = useAssetUrl(bg.assetId);
  const init = bg.crop ?? { x: 0, y: 0, width: bg.naturalWidth, height: bg.naturalHeight };
  const [crop, setCrop] = useState(init);
  const W = bg.naturalWidth;
  const H = bg.naturalHeight;
  const previewW = 560;
  const k = previewW / W;
  const set = (patch: Partial<typeof crop>) => {
    const c = { ...crop, ...patch };
    c.x = Math.max(0, Math.min(W - 1, Math.round(c.x)));
    c.y = Math.max(0, Math.min(H - 1, Math.round(c.y)));
    c.width = Math.max(1, Math.min(W - c.x, Math.round(c.width)));
    c.height = Math.max(1, Math.min(H - c.y, Math.round(c.height)));
    setCrop(c);
  };
  const apply = (value: typeof crop | null) => {
    useEditor.getState().commit(value ? 'Crop blueprint' : 'Remove crop', (d) => updateBackground(d, bg.id, { crop: value }));
    onClose();
  };
  return (
    <Dialog
      open
      title={t('Crop blueprint')}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={() => apply(null)}>{t('Reset (no crop)')}</button>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>{t('Cancel')}</button>
          <button className="btn primary" onClick={() => apply(crop.x === 0 && crop.y === 0 && crop.width === W && crop.height === H ? null : crop)}>{t('Apply crop')}</button>
        </>
      }
    >
      <div className="col">
        <svg width={previewW} height={H * k} style={{ maxWidth: '100%', background: '#eee', borderRadius: 4 }} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Crop preview')}>
          {url && <image href={url} width={W} height={H} opacity={0.35} />}
          {url && (
            <>
              <clipPath id="crop-prev"><rect x={crop.x} y={crop.y} width={crop.width} height={crop.height} /></clipPath>
              <image href={url} width={W} height={H} clipPath="url(#crop-prev)" />
            </>
          )}
          <rect x={crop.x} y={crop.y} width={crop.width} height={crop.height} fill="none" stroke="var(--cv-origin)" strokeWidth={Math.max(1, 2 / k)} />
        </svg>
        <div className="grid2">
          <Field label={t('Left (px)')}>{(fid) => <NumberInput id={fid} integer value={crop.x} min={0} max={W - 1} onCommit={(v) => set({ x: v ?? 0 })} />}</Field>
          <Field label={t('Top (px)')}>{(fid) => <NumberInput id={fid} integer value={crop.y} min={0} max={H - 1} onCommit={(v) => set({ y: v ?? 0 })} />}</Field>
          <Field label={t('Width (px)')}>{(fid) => <NumberInput id={fid} integer value={crop.width} min={1} max={W} onCommit={(v) => set({ width: v ?? W })} />}</Field>
          <Field label={t('Height (px)')}>{(fid) => <NumberInput id={fid} integer value={crop.height} min={1} max={H} onCommit={(v) => set({ height: v ?? H })} />}</Field>
        </div>
        <p className="tiny muted">{t('Cropping only hides parts of the image; the original is kept so you can undo or reset it at any time. The image scale is unchanged.')}</p>
      </div>
    </Dialog>
  );
}
