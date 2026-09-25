/**
 * Non-interactive canvas layers: grid, rulers, backgrounds, annotations
 * (dimensions and labels drawn at constant screen size).
 */
import { memo } from 'react';
import { add, dimensionNormal, dist, localToWorld, scale as vscale, worldBounds, type Vec } from '../../domain/geometry';
import type { BackgroundImage, ProjectDoc } from '../../domain/project';
import { isObjectVisible } from '../../domain/projectFactory';
import { kindInfo } from '../../domain/objectKinds';
import { formatLength } from '../../domain/units';
import type { View } from '../../editor/store';
import { useAssetUrl } from '../../app/assets';
import type { PlantLookup } from '../../engine/plantings';
import { objectPlantingsCached } from '../../app/computed';
import { plantDisplayName } from '../../plants/names';

const NICE = [1, 2, 5];

/** Smallest "nice" step (1/2/5 × 10^n mm) that is at least `minPx` on screen. */
export function niceStep(scale: number, minPx: number, base = 1): number {
  let exp = Math.floor(Math.log10(Math.max(1e-9, minPx / scale / base)));
  for (let guard = 0; guard < 40; guard++) {
    for (const n of NICE) {
      const s = n * 10 ** exp * base;
      if (s * scale >= minPx) return s;
    }
    exp++;
  }
  return 1000;
}

export const Grid = memo(function Grid({ view, width, height, gridMm }: { view: View; width: number; height: number; gridMm: number }) {
  // Effective grid step: the configured grid, coarsened so lines stay ≥ 8 px apart.
  let step = gridMm;
  while (step * view.scale < 8) step *= step * view.scale < 3 ? 10 : 2;
  const major = step * 5;
  const x0 = -view.x / view.scale;
  const y0 = -view.y / view.scale;
  const x1 = x0 + width / view.scale;
  const y1 = y0 + height / view.scale;
  let minor = '';
  let majorD = '';
  const startX = Math.floor(x0 / step) * step;
  const startY = Math.floor(y0 / step) * step;
  for (let x = startX; x <= x1; x += step) {
    const sx = Math.round(x * view.scale + view.x) + 0.5;
    const isMajor = Math.abs(x / major - Math.round(x / major)) < 1e-6;
    const seg = `M${sx} 0V${height}`;
    if (isMajor) majorD += seg;
    else minor += seg;
  }
  for (let y = startY; y <= y1; y += step) {
    const sy = Math.round(y * view.scale + view.y) + 0.5;
    const isMajor = Math.abs(y / major - Math.round(y / major)) < 1e-6;
    const seg = `M0 ${sy}H${width}`;
    if (isMajor) majorD += seg;
    else minor += seg;
  }
  const ox = view.x;
  const oy = view.y;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <path d={minor} stroke="var(--cv-grid-ink)" strokeOpacity={0.14} strokeWidth={1} />
      <path d={majorD} stroke="var(--cv-grid-ink)" strokeOpacity={0.3} strokeWidth={1} />
      <path d={`M${ox - 6} ${oy}H${ox + 6}M${ox} ${oy - 6}V${oy + 6}`} stroke="var(--cv-origin)" strokeWidth={1.5} />
    </g>
  );
});

export const RULER = 20;

export const Rulers = memo(function Rulers({ view, width, height, cursor }: { view: View; width: number; height: number; cursor: Vec | null }) {
  const step = niceStep(view.scale, 70);
  const sub = step / 5;
  const x0 = -view.x / view.scale;
  const y0 = -view.y / view.scale;
  const ticks = (from: number, to: number, horizontal: boolean) => {
    const els: React.ReactNode[] = [];
    let d = '';
    for (let v = Math.floor(from / sub) * sub; v <= to; v += sub) {
      const pos = horizontal ? v * view.scale + view.x : v * view.scale + view.y;
      const isMain = Math.abs(v / step - Math.round(v / step)) < 1e-6;
      const len = isMain ? 8 : 4;
      d += horizontal ? `M${pos} ${RULER}v${-len}` : `M${RULER} ${pos}h${-len}`;
      if (isMain) {
        const label = formatLength(v, 'metric', step >= 1000 ? 'm' : step >= 10 ? 'cm' : 'mm').replace(' ', '');
        els.push(
          horizontal ? (
            <text key={v} x={pos + 3} y={10} fontSize={9} fill="var(--cv-ruler-text)">
              {label}
            </text>
          ) : (
            <text key={v} x={10} y={pos - 3} fontSize={9} fill="var(--cv-ruler-text)" transform={`rotate(-90 10 ${pos - 3})`}>
              {label}
            </text>
          ),
        );
      }
    }
    return { d, els };
  };
  const h = ticks(x0, x0 + width / view.scale, true);
  const v = ticks(y0, y0 + height / view.scale, false);
  const cs = cursor ? { x: cursor.x * view.scale + view.x, y: cursor.y * view.scale + view.y } : null;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <rect x={0} y={0} width={width} height={RULER} fill="var(--panel)" fillOpacity={0.94} />
      <rect x={0} y={0} width={RULER} height={height} fill="var(--panel)" fillOpacity={0.94} />
      <path d={`M0 ${RULER + 0.5}H${width}M${RULER + 0.5} 0V${height}`} stroke="var(--border-strong)" />
      <path d={h.d + v.d} stroke="var(--cv-ruler-tick)" strokeWidth={1} />
      {h.els}
      {v.els}
      {cs && <path d={`M${cs.x} 0v${RULER}M0 ${cs.y}h${RULER}`} stroke="var(--cv-origin)" />}
      <rect x={0} y={0} width={RULER} height={RULER} fill="var(--panel)" />
      <text x={4} y={13} fontSize={8} fill="var(--cv-ruler-text)">
        m
      </text>
    </g>
  );
});

/** Scale bar in the corner showing a nice real-world length. */
export const ScaleBar = memo(function ScaleBar({ view, height }: { view: View; height: number }) {
  const len = niceStep(view.scale, 80);
  const px = len * view.scale;
  const x = 32;
  const y = height - 18;
  return (
    <g pointerEvents="none" aria-hidden="true">
      <rect x={x - 6} y={y - 16} width={px + 12 + 60} height={24} rx={4} fill="var(--panel)" fillOpacity={0.9} />
      <path d={`M${x} ${y - 5}v5h${px}v-5`} fill="none" stroke="var(--text)" strokeWidth={1.5} />
      <path d={`M${x} ${y}h${px / 2}`} stroke="var(--text)" strokeWidth={4} />
      <text x={x + px + 6} y={y} fontSize={11} fill="var(--text)">
        {formatLength(len)}
      </text>
    </g>
  );
});

function BackgroundImageView({ bg }: { bg: BackgroundImage }) {
  const url = useAssetUrl(bg.assetId);
  const w = bg.naturalWidth;
  const h = bg.naturalHeight;
  const c = bg.crop;
  const clipId = `clip-${bg.id}`;
  const { x, y, rotation } = bg.transform;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${bg.mmPerPx}) translate(${-w / 2} ${-h / 2})`}>
      {c && (
        <clipPath id={clipId}>
          <rect x={c.x} y={c.y} width={c.width} height={c.height} />
        </clipPath>
      )}
      {url ? (
        <image href={url} x={0} y={0} width={w} height={h} opacity={bg.opacity} preserveAspectRatio="none" clipPath={c ? `url(#${clipId})` : undefined} style={{ imageRendering: 'auto' }} />
      ) : (
        <rect x={0} y={0} width={w} height={h} fill="#ddd" opacity={0.4} />
      )}
    </g>
  );
}

export const Backgrounds = memo(function Backgrounds({ doc }: { doc: ProjectDoc }) {
  const layer = doc.layers.find((l) => l.role === 'background');
  if (layer && !layer.visible) return null;
  return (
    <g pointerEvents="none">
      {doc.backgrounds.filter((b) => b.visible).map((bg) => (
        <BackgroundImageView key={bg.id} bg={bg} />
      ))}
    </g>
  );
});

/** Dimension objects and object labels at constant screen size. */
export function AnnotationLayer({ doc, view, lookup, selection }: { doc: ProjectDoc; view: View; lookup: PlantLookup; selection: ReadonlySet<string> }) {
  const toS = (p: Vec) => ({ x: p.x * view.scale + view.x, y: p.y * view.scale + view.y });
  const out: React.ReactNode[] = [];
  for (const layer of doc.layers) {
    if (layer.role === 'background' || !layer.visible) continue;
    for (const id of layer.objectIds) {
      const o = doc.objects[id];
      if (!o || !isObjectVisible(doc, o)) continue;
      if (o.shape.type === 'dimension') {
        const s = o.shape;
        const n = dimensionNormal(s.a, s.b);
        const off = vscale(n, s.offset);
        const a = toS(localToWorld(o.transform, add(s.a, off)));
        const b = toS(localToWorld(o.transform, add(s.b, off)));
        const a0 = toS(localToWorld(o.transform, s.a));
        const b0 = toS(localToWorld(o.transform, s.b));
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        let ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        if (ang > 90) ang -= 180;
        if (ang < -90) ang += 180;
        const label = formatLength(dist(s.a, s.b), doc.settings.unitSystem);
        const color = selection.has(o.id) ? 'var(--cv-select)' : kindInfo(o.kind).stroke;
        out.push(
          <g key={id} pointerEvents="none">
            <path d={`M${a0.x} ${a0.y}L${a.x} ${a.y}M${b0.x} ${b0.y}L${b.x} ${b.y}`} stroke={color} strokeOpacity={0.5} strokeDasharray="3 3" />
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1.25} markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
            <g transform={`translate(${mid.x} ${mid.y}) rotate(${ang})`}>
              <rect x={-label.length * 3.4 - 4} y={-17} width={label.length * 6.8 + 8} height={14} rx={3} fill="var(--canvas-bg)" fillOpacity={0.9} />
              <text y={-6} textAnchor="middle" fontSize={11} fill={color} fontWeight={600}>
                {label}
              </text>
            </g>
          </g>,
        );
        continue;
      }
      if (o.shape.type === 'text' || o.kind === 'line') continue;
      const b = worldBounds(o.transform, o.shape);
      const wpx = (b.maxX - b.minX) * view.scale;
      const hpx = (b.maxY - b.minY) * view.scale;
      if (wpx < 34 || hpx < 18) continue;
      const c = toS({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
      const info = kindInfo(o.kind);
      const lines: string[] = [];
      if (o.code) lines.push(o.code);
      if (wpx > 90 && hpx > 34) lines.push(o.name);
      if (info.plantable && wpx > 90 && hpx > 48) {
        const comps = objectPlantingsCached(doc, o, lookup);
        const names = comps.filter((cp) => !cp.plant || plantDisplayName(cp.plant) !== o.name).map((cp) => {
          const nm = cp.plant ? plantDisplayName(cp.plant) : cp.planting.plantId;
          return cp.quantity != null && o.kind !== 'tree' && o.kind !== 'shrub' ? `${nm} ×${cp.quantity}` : nm;
        });
        if (names.length) {
          const full = names.join(', ');
          // Fall back to a summary when the list does not fit the shape.
          if (full.length * 6 > wpx - 8 && names.length > 1) {
            const total = comps.reduce((sum, cp) => sum + (cp.quantity ?? 0), 0);
            lines.push(`${names.length} crops${total ? ` · ${total} plants` : ''}`);
          } else lines.push(full);
        }
      }
      if (!lines.length) continue;
      const startY = c.y - ((lines.length - 1) * 13) / 2;
      out.push(
        <g key={id} pointerEvents="none">
          {lines.map((t, i) => (
            <text
              key={i}
              x={c.x}
              y={startY + i * 13}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={i === 0 ? 11 : 10.5}
              fontWeight={i === 0 ? 700 : 500}
              fill="var(--cv-ink)"
              stroke="var(--cv-halo)"
              strokeOpacity={0.75}
              strokeWidth={3}
              paintOrder="stroke"
            >
              {t.length > 48 ? `${t.slice(0, 46)}…` : t}
            </text>
          ))}
        </g>,
      );
    }
  }
  return <g>{out}</g>;
}
