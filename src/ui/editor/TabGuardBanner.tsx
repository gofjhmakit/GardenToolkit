import { AlertTriangle } from 'lucide-react';
import { useTabGuard } from '../../app/tabGuard';

export function TabGuardBanner() {
  const { otherTabs, staleSavedAt } = useTabGuard();
  if (!otherTabs) return null;
  return (
    <div className="callout warn" role="alert" style={{ position: 'fixed', top: 84, left: '50%', transform: 'translateX(-50%)', zIndex: 40, boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,.15))' }}>
      <AlertTriangle size={14} />
      <span>
        {staleSavedAt
          ? 'This project was changed and saved in another tab. Reload to see those changes — edits made here would overwrite them.'
          : 'This project is also open in another tab. Edit it in one tab only, or changes may overwrite each other.'}
      </span>
      {staleSavedAt && (
        <button className="btn sm primary" onClick={() => location.reload()}>
          Reload
        </button>
      )}
      <button className="btn sm ghost" onClick={() => useTabGuard.setState({ otherTabs: false })}>
        Dismiss
      </button>
    </div>
  );
}
