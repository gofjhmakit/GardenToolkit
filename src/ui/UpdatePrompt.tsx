import { useEffect, useState } from 'react';
import { useEditor } from '../editor/store';
import { flushSave } from '../app/autosave';
import { t } from '../i18n';

/** How often an open app asks the server whether a new version exists. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Registers the service worker (offline support) and keeps the app up to date.
 *
 * A new version waits until every tab is closed unless it is activated, so a
 * plain reload keeps the old one. Therefore:
 * - updates are looked for on start, whenever the app returns to the foreground, and hourly;
 * - with no project open (home screen) a downloaded update is applied straight away;
 * - with a project open the user is asked, and the update is applied when they leave the
 *   project, so an edit is never interrupted.
 */
export function UpdatePrompt() {
  const [update, setUpdate] = useState<null | (() => Promise<void>)>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  useEffect(() => {
    if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    const cleanups: (() => void)[] = [];
    void import('virtual:pwa-register').then(({ registerSW }) => {
      if (cancelled) return;
      const apply = async () => {
        await flushSave().catch(() => {});
        await updateSW(true);
      };
      const updateSW = registerSW({
        onNeedRefresh: () => {
          if (!useEditor.getState().doc) {
            void apply();
            return;
          }
          setUpdate(() => apply);
          // Apply once the user goes back to the project list.
          const unsub = useEditor.subscribe((s) => {
            if (!s.doc) {
              unsub();
              void apply();
            }
          });
          cleanups.push(unsub);
        },
        onOfflineReady: () => setOfflineReady(true),
        onRegisteredSW: (_url, registration) => {
          if (!registration) return;
          const check = () => {
            if (navigator.onLine && registration.installing == null) void registration.update().catch(() => {});
          };
          const onVisible = () => {
            if (document.visibilityState === 'visible') check();
          };
          const timer = window.setInterval(check, UPDATE_CHECK_MS);
          document.addEventListener('visibilitychange', onVisible);
          cleanups.push(() => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
          });
        },
      });
    });
    return () => {
      cancelled = true;
      cleanups.forEach((c) => c());
    };
  }, []);
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 6000);
    return () => clearTimeout(t);
  }, [offlineReady]);
  if (!update && !offlineReady) return null;
  return (
    <div className="toast-host update-host" role="status">
      <div className="toast">
        {update ? (
          <div className="col" style={{ gap: 6 }}>
            <strong>{t('A new version of Garden Toolkit is available.')}</strong>
            <span className="muted">{t('Your work is saved. Reload to update, or it updates when you close this garden.')}</span>
            <div className="row">
              <button className="btn sm primary" onClick={() => void update()}>{t('Reload now')}</button>
              <button className="btn sm" onClick={() => setUpdate(null)}>{t('Later')}</button>
            </div>
          </div>
        ) : (
          <span>{t('Garden Toolkit is ready to work offline.')}</span>
        )}
      </div>
    </div>
  );
}
