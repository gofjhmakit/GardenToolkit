import { useEditor } from '../../editor/store';
import { kindInfo } from '../../domain/objectKinds';
import { ObjectInspector } from './ObjectInspector';
import { MultiInspector } from './MultiInspector';
import { BackgroundInspector } from './BackgroundInspector';
import { ProjectSummary } from './ProjectSummary';

export function Inspector() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const bgId = useEditor((s) => s.selectedBackgroundId);
  if (!doc) return null;
  let title = 'Garden';
  let header: React.ReactNode = null;
  let body: React.ReactNode;
  if (selection.length === 1 && doc.objects[selection[0]]) {
    const o = doc.objects[selection[0]];
    const info = kindInfo(o.kind);
    title = info.label;
    header = (
      <>
        <span className="swatch" style={{ background: o.style.fill ?? (info.fill === 'none' ? info.stroke : info.fill) }} aria-hidden="true" />
        <h2>{info.label}</h2>
        <span className="code mono muted">{o.code}</span>
      </>
    );
    body = <ObjectInspector key={selection[0]} id={selection[0]} />;
  } else if (selection.length > 1) {
    title = `${selection.length} objects`;
    body = <MultiInspector ids={selection} />;
  } else if (bgId && doc.backgrounds.some((b) => b.id === bgId)) {
    title = 'Blueprint image';
    body = <BackgroundInspector id={bgId} />;
  } else {
    body = <ProjectSummary />;
  }
  return (
    <aside className="side right" aria-label="Inspector">
      <div className="side-header">{header ?? <h2>{title}</h2>}</div>
      <div className="side-body" key={selection.join(",") || bgId || "garden"}>{body}</div>
    </aside>
  );
}
