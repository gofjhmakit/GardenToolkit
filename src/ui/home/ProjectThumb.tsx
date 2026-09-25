import { memo, useEffect, useState } from 'react';
import type { ProjectDoc } from '../../domain/project';
import { loadProject } from '../../persistence/projectRepo';
import { contentBounds } from '../../editor/commands';
import { worldOutline, expandBounds, isClosedShape } from '../../domain/geometry';
import { kindInfo } from '../../domain/objectKinds';

/** Small drawing of a project's objects for the project list (no images, no plant markers). */
export const ProjectThumb = memo(function ProjectThumb({ id, updatedAt }: { id: string; updatedAt: string }) {
  const [doc, setDoc] = useState<ProjectDoc | null>(null);
  useEffect(() => {
    let alive = true;
    void loadProject(id).then((r) => alive && r?.ok && setDoc(r.doc));
    return () => {
      alive = false;
    };
  }, [id, updatedAt]);
  const objs = doc ? Object.values(doc.objects).filter((o) => !o.hidden && o.shape.type !== 'text' && o.shape.type !== 'dimension') : [];
  const b = doc && objs.length ? contentBounds({ ...doc, backgrounds: [] }) : null;
  if (!b) return <div className="project-thumb" aria-hidden="true" />;
  const vb = expandBounds(b, Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.08 + 100);
  return (
    <div className="project-thumb" aria-hidden="true">
      <svg viewBox={`${vb.minX} ${vb.minY} ${vb.maxX - vb.minX} ${vb.maxY - vb.minY}`} preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
        {doc!.layers.flatMap((l) =>
          l.visible
            ? l.objectIds
                .map((oid) => doc!.objects[oid])
                .filter((o) => o && objs.includes(o))
                .map((o) => {
                  const info = kindInfo(o.kind);
                  const pts = worldOutline(o.transform, o.shape, 24).map((p) => `${p.x},${p.y}`).join(' ');
                  if (!isClosedShape(o.shape)) {
                    const w = o.shape.type === 'polyline' && o.shape.width ? o.shape.width : undefined;
                    return <polyline key={o.id} points={pts} fill="none" stroke={o.kind === 'path' ? info.fill : info.stroke} strokeWidth={w ?? 2} vectorEffect={w ? undefined : 'non-scaling-stroke'} strokeLinejoin="round" />;
                  }
                  return <polygon key={o.id} points={pts} fill={o.style.fill ?? info.fill} fillOpacity={o.kind === 'tree' || o.kind === 'shrub' ? 0.7 : 1} stroke={info.stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />;
                })
            : [],
        )}
      </svg>
    </div>
  );
});

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = (Date.parse(iso) - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), 'month');
  return rtf.format(Math.round(diff / (86400 * 365)), 'year');
}
