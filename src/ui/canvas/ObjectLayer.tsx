import { memo } from 'react';
import type { GardenObject, ProjectDoc } from '../../domain/project';
import { kindInfo } from '../../domain/objectKinds';
import { isObjectVisible } from '../../domain/projectFactory';
import type { PlantingComputation } from '../../engine/plantings';
import { objectPlantingsCached } from '../../app/computed';
import type { PlantLookup } from '../../engine/plantings';
import { plantColor } from '../plantColors';
import type { Vec } from '../../domain/geometry';

const pointsAttr = (pts: Vec[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

export function objectTransform(o: GardenObject): string {
  const { x, y, rotation } = o.transform;
  return rotation ? `translate(${x} ${y}) rotate(${rotation})` : `translate(${x} ${y})`;
}

function fillFor(o: GardenObject): string {
  const info = kindInfo(o.kind);
  if (o.style.fill) return o.style.fill;
  return info.pattern ? `url(#pat-${o.kind})` : info.fill;
}

/** The shape of one object, in its local frame. */
export const ShapeElement = memo(function ShapeElement({ o, printMode }: { o: GardenObject; printMode?: number }) {
  const info = kindInfo(o.kind);
  const stroke = o.style.stroke ?? info.stroke;
  const opacity = o.style.opacity ?? 1;
  const common = {
    stroke,
    strokeWidth: printMode ?? 1.25,
    vectorEffect: printMode ? undefined : ('non-scaling-stroke' as const),
    opacity,
  };
  const s = o.shape;
  switch (s.type) {
    case 'rect':
      return <rect x={-s.width / 2} y={-s.height / 2} width={s.width} height={s.height} rx={s.cornerRadius ?? 0} fill={fillFor(o)} {...common} />;
    case 'ellipse':
      if (o.kind === 'tree' || o.kind === 'shrub') {
        const trunk = Math.max(40, Math.min(s.rx, s.ry) * (o.kind === 'tree' ? 0.08 : 0.05));
        const root = o.props.tree?.showRootZone ? o.props.tree.rootZoneRadiusMm : null;
        return (
          <g opacity={opacity}>
            {root ? <circle r={root} fill="none" stroke={stroke} strokeDasharray="6 5" strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.6} /> : null}
            <ellipse rx={s.rx} ry={s.ry} fill={o.style.fill ?? info.fill} fillOpacity={0.55} stroke={stroke} strokeWidth={printMode ?? 1.25} vectorEffect={printMode ? undefined : 'non-scaling-stroke'} />
            <ellipse rx={s.rx * 0.62} ry={s.ry * 0.62} fill="none" stroke={stroke} strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <circle r={trunk} fill="#5E4127" />
          </g>
        );
      }
      return <ellipse rx={s.rx} ry={s.ry} fill={fillFor(o)} {...common} />;
    case 'polygon':
      return <polygon points={pointsAttr(s.points)} fill={fillFor(o)} {...common} strokeLinejoin="round" />;
    case 'polyline':
      if (o.kind === 'path') {
        return (
          <g opacity={opacity}>
            <polyline points={pointsAttr(s.points)} fill="none" stroke={stroke} strokeWidth={s.width + 40} strokeLinejoin="round" strokeLinecap="butt" strokeOpacity={0.6} />
            <polyline points={pointsAttr(s.points)} fill="none" stroke={o.style.fill ?? `url(#pat-path)`} strokeWidth={s.width} strokeLinejoin="round" strokeLinecap="butt" />
          </g>
        );
      }
      return <polyline points={pointsAttr(s.points)} fill="none" stroke={stroke} strokeWidth={s.width > 0 ? s.width : 1.5} vectorEffect={s.width > 0 ? undefined : 'non-scaling-stroke'} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
    case 'text':
      return (
        <text fontSize={s.fontSize} textAnchor="middle" dominantBaseline="central" fill={o.style.fill ?? info.fill} opacity={opacity} style={{ whiteSpace: 'pre' }}>
          {s.text}
        </text>
      );
    case 'dimension':
      return null; // drawn in the annotation layer at constant screen size
  }
});

/** Plant positions / rows drawn inside a bed. One <path> per planting keeps the DOM small. */
export const PlantingMarks = memo(function PlantingMarks({ comps, printMode }: { comps: PlantingComputation[]; printMode?: number }) {
  if (!comps.length) return null;
  const hostIsPlant = comps[0].host.kind === 'tree' || comps[0].host.kind === 'shrub';
  if (hostIsPlant) return null;
  return (
    <g pointerEvents="none">
      {comps.map((c) => {
        const color = plantColor(c.planting.plantId, c.plant?.category);
        const r = Math.max(8, Math.min((c.capacity.inRowMm ?? 100) * 0.3, (c.capacity.rowMm ?? 100) * 0.3, 400));
        const positions = c.capacity.positions;
        const tooMany = positions.length > 2500;
        let d = '';
        if (!tooMany) {
          for (const p of positions) d += `M${p.x - r} ${p.y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
        }
        let rows = '';
        if (c.capacity.method === 'rows' || tooMany) {
          for (const [a, b] of c.capacity.rowLines) rows += `M${a.x} ${a.y}L${b.x} ${b.y}`;
        }
        return (
          <g key={c.planting.id}>
            {c.region.length > 2 && comps.length > 1 && (
              <polygon points={pointsAttr(c.region)} fill={color} fillOpacity={0.1} stroke={color} strokeOpacity={0.7} strokeDasharray="4 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            )}
            {rows && <path d={rows} stroke={color} strokeOpacity={0.55} strokeWidth={printMode ? printMode * 0.5 : 1} vectorEffect={printMode ? undefined : 'non-scaling-stroke'} fill="none" />}
            {d && <path d={d} fill={color} fillOpacity={0.75} stroke="#fff" strokeOpacity={0.6} strokeWidth={printMode ? printMode * 0.2 : 0.5} vectorEffect={printMode ? undefined : 'non-scaling-stroke'} />}
          </g>
        );
      })}
    </g>
  );
});

const ObjectView = memo(function ObjectView({ o, comps, showMarks, printMode }: { o: GardenObject; comps: PlantingComputation[]; showMarks: boolean; printMode?: number }) {
  return (
    <g transform={objectTransform(o)} data-object-id={o.id}>
      <ShapeElement o={o} printMode={printMode} />
      {showMarks && <PlantingMarks comps={comps} printMode={printMode} />}
    </g>
  );
});

interface ObjectLayerProps {
  doc: ProjectDoc;
  lookup: PlantLookup;
  /** World-unit stroke width for print/export; omitted = screen rendering. */
  printMode?: number;
}

export function ObjectLayer({ doc, lookup, printMode }: ObjectLayerProps) {
  const showMarks = doc.settings.showPlantMarkers;
  return (
    <g>
      {doc.layers.map((layer) =>
        layer.role === 'background' || !layer.visible ? null : (
          <g key={layer.id} data-layer-id={layer.id}>
            {layer.objectIds.map((id) => {
              const o = doc.objects[id];
              if (!o || !isObjectVisible(doc, o)) return null;
              const comps = kindInfo(o.kind).plantable ? objectPlantingsCached(doc, o, lookup) : EMPTY;
              return <ObjectView key={id} o={o} comps={comps} showMarks={showMarks} printMode={printMode} />;
            })}
          </g>
        ),
      )}
    </g>
  );
}

const EMPTY: PlantingComputation[] = [];
