import { Dialog } from '../components/Dialog';
import { shortcutLabel } from '../components/platform';
import { SHORTCUTS } from './useShortcuts';
import { t } from '../../i18n';

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const groups = [...new Set(SHORTCUTS.map((s) => s.group))];
  return (
    <Dialog open={open} title={t('Keyboard shortcuts')} onClose={onClose}>
      <div className="grid2">
        {groups.map((g) => (
          <div key={g}>
            <h4 style={{ margin: '6px 0' }}>{t(g)}</h4>
            <table className="table">
              <tbody>
                {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                  <tr key={s.keys}>
                    <td className="nowrap">
                      <kbd>{s.keys.includes('Mod') || s.keys.includes('Shift') || s.keys.includes('Alt') ? shortcutLabel(s.keys) : s.keys}</kbd>
                    </td>
                    <td>{s.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
