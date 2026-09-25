/**
 * Plan export: produces a standalone, scaled SVG of the garden (in real
 * millimetre units), and PNG/PDF from it. Reuses the canvas renderers so
 * the exported plan always matches what the user sees.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import type { ProjectDoc } from '../domain/project';
import { add, boundsOfPoints, dimensionNormal, dist, expandBounds, localToWorld, scale as vscale, worldBounds, type Bounds } from '../domain/geometry';
import { isObjectVisible } from '../domain/projectFactory';
import { formatLength } from '../domain/units';
import { contentBounds } from '../editor/commands';
import type { PlantLookup } from '../engine/plantings';
import { Patterns } from '../ui/canvas/Patterns';
import { ObjectLayer } from '../ui/canvas/ObjectLayer';
import { niceStep } from '../ui/canvas/Layers2D';
import { getAsset } from '../persistence/projectRepo';
import { bytesToBase64 } from '../persistence/projectPackage';

export interface PlanSvg {
  svg: string;
  bounds: Bounds;
  widthMm: number;
  heightMm: number;
}

async function backgroundDataUrls(doc: ProjectDoc): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const bg of doc.backgrounds) {
    if (!bg.visible) continue;
    try {
      const a = await getAsset(bg.assetId);
      if (a) out[bg.assetId] = `data:${a.mimeType};base64,${bytesToBase64(new Uint8Array(await a.blob.arrayBuffer()))}`;
    } catch {
      /* image missing — export without it */
    }
  }
  return out;
}

function PlanContent({ doc, lookup, images, bounds, includeBackground }: { doc: ProjectDoc; lookup: PlantLookup; images: Record<string, string>; bounds: Bounds; includeBackground: boolean }) {
  const extent = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const stroke = extent / 1400;
  const font = Math.max(extent / 70, 60);
  const bgLayer = doc.layers.find((l) => l.role === 'background');
  const labels: React.ReactNode[] = [];
  for (const layer of doc.layers) {
    if (layer.role === 'background' || !layer.visible) continue;
    for (const id of layer.objectIds) {
      const o = doc.objects[id];
      if (!o || !isObjectVisible(doc, o)) continue;
      if (o.shape.type === 'dimension') {
        const s = o.shape;
        const off = vscale(dimensionNormal(s.a, s.b), s.offset);
        const a = localToWorld(o.transform, add(s.a, off));
        const b = localToWorld(o.transform, add(s.b, off));
        let ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        if (ang > 90) ang -= 180;
        if (ang < -90) ang += 180;
        labels.push(
          <g key={id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#2C5E6B" strokeWidth={stroke} />
            <circle cx={a.x} cy={a.y} r={stroke * 2.5} fill="#2C5E6B" />
            <circle cx={b.x} cy={b.y} r={stroke * 2.5} fill="#2C5E6B" />
            <text transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${ang})`} y={-font * 0.3} textAnchor="middle" fontSize={font * 0.8} fill="#2C5E6B" fontFamily="Helvetica, Arial, sans-serif">
              {formatLength(dist(s.a, s.b), doc.settings.unitSystem)}
            </text>
          </g>,
        );
        continue;
      }
      if (!o.code || o.shape.type === 'text' || o.kind === 'line') continue;
      const b = worldBounds(o.transform, o.shape);
      const size = Math.min(b.maxX - b.minX, b.maxY - b.minY);
      const fs = Math.min(font, Math.max(size / 3, font * 0.45));
      const cx = (b.minX + b.maxX) / 2;
      const cy = (b.minY + b.maxY) / 2;
      const tw = o.code.length * fs * 0.62 + fs * 0.5;
      // A plain background box instead of a stroked halo: stroked text renders poorly in PDF converters.
      labels.push(
        <g key={id}>
          <rect x={cx - tw / 2} y={cy - fs * 0.62} width={tw} height={fs * 1.24} rx={fs * 0.25} fill="#ffffff" fillOpacity={0.85} />
          <text x={cx} y={cy + fs * 0.35} textAnchor="middle" fontSize={fs} fontWeight="bold" fill="#1d1d1b" fontFamily="Helvetica, Arial, sans-serif">
            {o.code}
          </text>
        </g>,
      );
    }
  }
  return (
    <>
      <Patterns />
      {includeBackground && (!bgLayer || bgLayer.visible) &&
        doc.backgrounds.filter((bg) => bg.visible && images[bg.assetId]).map((bg) => {
          const w = bg.naturalWidth;
          const h = bg.naturalHeight;
          const c = bg.crop;
          return (
            <g key={bg.id} transform={`translate(${bg.transform.x} ${bg.transform.y}) rotate(${bg.transform.rotation}) scale(${bg.mmPerPx}) translate(${-w / 2} ${-h / 2})`}>
              {c && (
                <clipPath id={`pclip-${bg.id}`}>
                  <rect x={c.x} y={c.y} width={c.width} height={c.height} />
                </clipPath>
              )}
              <image href={images[bg.assetId]} width={w} height={h} opacity={Math.min(bg.opacity, 0.6)} preserveAspectRatio="none" clipPath={c ? `url(#pclip-${bg.id})` : undefined} />
            </g>
          );
        })}
      <ObjectLayer doc={doc} lookup={lookup} printMode={stroke} />
      {labels}
    </>
  );
}

export async function buildPlanSvg(doc: ProjectDoc, lookup: PlantLookup, opts: { includeBackground?: boolean; titleBlock?: boolean } = {}): Promise<PlanSvg> {
  const includeBackground = opts.includeBackground ?? true;
  const images = includeBackground ? await backgroundDataUrls(doc) : {};
  let b = contentBounds(doc) ?? { minX: 0, minY: 0, maxX: 10000, maxY: 10000 };
  if (!includeBackground) {
    const pts = Object.values(doc.objects).filter((o) => !o.hidden).flatMap((o) => {
      const wb = worldBounds(o.transform, o.shape);
      return [{ x: wb.minX, y: wb.minY }, { x: wb.maxX, y: wb.maxY }];
    });
    if (pts.length) b = boundsOfPoints(pts);
  }
  const margin = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.04 + 200;
  let bounds = expandBounds(b, margin);
  const extent = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const titleH = opts.titleBlock ? extent * 0.06 : 0;
  // Scale bar + title strip below the plan.
  const barLen = niceStep(1, extent / 6);
  bounds = { ...bounds, maxY: bounds.maxY + extent * 0.05 + titleH };
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  const barY = bounds.maxY - extent * 0.03 - titleH;
  const barX = bounds.minX + margin;
  const fs = extent / 70;
  const markup = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox={`${bounds.minX} ${bounds.minY} ${w} ${h}`} width={`${(w / 1000).toFixed(3)}m`} height={`${(h / 1000).toFixed(3)}m`}>
      <rect x={bounds.minX} y={bounds.minY} width={w} height={h} fill="#ffffff" />
      <PlanContent doc={doc} lookup={lookup} images={images} bounds={b} includeBackground={includeBackground} />
      <g fontFamily="Helvetica, Arial, sans-serif">
        <rect x={barX} y={barY - fs * 0.3} width={barLen / 2} height={fs * 0.6} fill="#23241f" />
        <rect x={barX + barLen / 2} y={barY - fs * 0.3} width={barLen / 2} height={fs * 0.6} fill="#ffffff" stroke="#23241f" strokeWidth={fs * 0.08} />
        <text x={barX} y={barY + fs * 1.4} fontSize={fs} fill="#23241f">0</text>
        <text x={barX + barLen} y={barY + fs * 1.4} fontSize={fs} fill="#23241f" textAnchor="middle">
          {formatLength(barLen, doc.settings.unitSystem)}
        </text>
        {opts.titleBlock && (
          <text x={bounds.minX + margin} y={bounds.maxY - titleH * 0.35} fontSize={fs * 1.6} fontWeight="bold" fill="#23241f">
            {doc.meta.name}
          </text>
        )}
      </g>
    </svg>,
  );
  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`, bounds, widthMm: w, heightMm: h };
}

export async function exportPlanSvg(doc: ProjectDoc, lookup: PlantLookup): Promise<Blob> {
  const { svg } = await buildPlanSvg(doc, lookup, { titleBlock: true });
  return new Blob([svg], { type: 'image/svg+xml' });
}

/** Rasterises the plan SVG to PNG at the given pixel width. */
export async function planPng(doc: ProjectDoc, lookup: PlantLookup, widthPx: number, opts: { titleBlock?: boolean } = {}): Promise<{ blob: Blob; width: number; height: number }> {
  const { svg, widthMm, heightMm } = await buildPlanSvg(doc, lookup, { titleBlock: opts.titleBlock ?? true });
  const height = Math.round((widthPx * heightMm) / widthMm);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, widthPx, height);
    ctx.drawImage(img, 0, 0, widthPx, height);
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG encoding failed'))), 'image/png'));
    return { blob, width: widthPx, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportPlanPng(doc: ProjectDoc, lookup: PlantLookup, widthPx = 3000): Promise<Blob> {
  return (await planPng(doc, lookup, widthPx)).blob;
}

