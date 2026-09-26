import { useEffect, useState } from 'react';
import { listSnapshots, recoverFromSnapshot } from '../persistence/projectRepo';
import type { SnapshotRecord } from '../persistence/db';
import { toast } from './components/feedback';
import { t } from '../i18n';

/** Offers version snapshots when a project cannot be opened. */
export function RecoveryPanel({ projectId, onRecovered }: { projectId: string; onRecovered: () => void }) {
  const [snaps, setSnaps] = useState<Omit<SnapshotRecord, 'doc'>[] | null>(null);
  useEffect(() => {
    void listSnapshots(projectId).then(setSnaps).catch(() => setSnaps([]));
  }, [projectId]);
  if (!snaps?.length) return null;
  return (
    <div className="card col" style={{ textAlign: 'left', margin: '12px 0' }}>
      <h3>{t('Restore a saved version')}</h3>
      <table className="table">
        <tbody>
          {snaps.map((s) => (
            <tr key={s.id}>
              <td>{new Date(s.createdAt).toLocaleString()}</td>
              <td>{s.label}</td>
              <td className="r">
                <button
                  className="btn sm"
                  onClick={async () => {
                    if (await recoverFromSnapshot(projectId, s.id)) {
                      toast('ok', t('Project restored from a saved version'));
                      onRecovered();
                    } else toast('error', t('That version could not be read either.'));
                  }}
                >
                  {t('Restore this version')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
