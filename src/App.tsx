import { useEffect, useState } from 'react';
import { HomeScreen } from './ui/home/HomeScreen';
import { EditorShell } from './ui/editor/EditorShell';
import { FeedbackHost } from './ui/components/feedback';
import { closeProject, navigate, openProjectById } from './app/projectActions';
import { useEditor } from './editor/store';
import { usePlants } from './app/plantStore';
import { usePrefs } from './app/prefs';
import { startAutosave } from './app/autosave';
import { UpdatePrompt } from './ui/UpdatePrompt';
import { RecoveryPanel } from './ui/RecoveryPanel';
import { ErrorBoundary } from './ui/ErrorBoundary';

function parseRoute(): { page: 'home' } | { page: 'project'; id: string } {
  const m = /^#\/p\/([\w-]+)$/.exec(location.hash);
  return m ? { page: 'project', id: m[1] } : { page: 'home' };
}

export function App() {
  const [route, setRoute] = useState(parseRoute);
  const [error, setError] = useState<{ message: string; details: string[] } | null>(null);
  const doc = useEditor((s) => s.doc);
  const theme = usePrefs((s) => s.theme);

  useEffect(() => {
    void usePlants.getState().load();
    startAutosave();
    const on = () => setRoute(parseRoute());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (route.page === 'project') {
      if (useEditor.getState().doc?.id === route.id) return;
      void (async () => {
        await closeProject();
        const res = await openProjectById(route.id);
        if (!cancelled && !res.ok) setError({ message: res.error, details: res.details });
      })();
    } else {
      void closeProject();
    }
    return () => {
      cancelled = true;
    };
  }, [route]);

  useEffect(() => {
    document.title = doc ? `${doc.meta.name} — Garden Toolkit` : 'Garden Toolkit';
  }, [doc?.meta.name, doc]);

  return (
    <>
      <ErrorBoundary resetKey={route.page === 'project' ? route.id : 'home'} onHome={() => navigate('#/')}>
        {route.page === 'home' && <HomeScreen />}
        {route.page === 'project' && error && (
          <div className="home">
            <div className="home-inner">
              <div className="empty-state">
                <h2>This project could not be opened</h2>
                <p>{error.message}</p>
                {error.details.length > 0 && <pre className="small" style={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>{error.details.join('\n')}</pre>}
                <p className="small muted">Your data has not been changed. You can restore an earlier version below, or import a backup file.</p>
                <RecoveryPanel projectId={route.id} onRecovered={() => { setError(null); setRoute({ ...route }); }} />
                <button className="btn primary" onClick={() => navigate('#/')}>Back to projects</button>
              </div>
            </div>
          </div>
        )}
        {route.page === 'project' && !error && doc && doc.id === route.id && <EditorShell onHome={() => navigate('#/')} />}
        {route.page === 'project' && !error && (!doc || doc.id !== route.id) && <div className="home"><div className="home-inner muted">Opening project…</div></div>}
      </ErrorBoundary>
      <FeedbackHost />
      <UpdatePrompt />
    </>
  );
}
