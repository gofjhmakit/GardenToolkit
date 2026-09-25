import { useEffect, useState } from 'react';

/**
 * Registers the service worker (offline support) and offers a reload when a
 * new app version has been downloaded. Updates never apply mid-edit silently.
 */
export function UpdatePrompt() {
  const [update, setUpdate] = useState<null | (() => Promise<void>)>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  useEffect(() => {
    if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    void import('virtual:pwa-register').then(({ registerSW }) => {
      if (cancelled) return;
      const updateSW = registerSW({
        onNeedRefresh: () => setUpdate(() => () => updateSW(true)),
        onOfflineReady: () => setOfflineReady(true),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 6000);
    return () => clearTimeout(t);
  }, [offlineReady]);
  if (!update && !offlineReady) return null;
  return (
    <div className="toast-host" style={{ left: 16, right: 'auto' }} role="status">
      <div className="toast">
        {update ? (
          <div className="col" style={{ gap: 6 }}>
            <strong>A new version of Garden Toolkit is available.</strong>
            <span className="muted">Your work is saved. Reload to update.</span>
            <div className="row">
              <button className="btn sm primary" onClick={() => void update()}>Reload now</button>
              <button className="btn sm" onClick={() => setUpdate(null)}>Later</button>
            </div>
          </div>
        ) : (
          <span>Garden Toolkit is ready to work offline.</span>
        )}
      </div>
    </div>
  );
}
