import { useEditor } from '../../editor/store';
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
  let body: React.ReactNode;
  if (selection.length === 1 && doc.objects[selection[0]]) {
    title = 'Properties';
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
      <div className="side-header">
        <h2>{title}</h2>
      </div>
      <div className="side-body">{body}</div>
    </aside>
  );
}
