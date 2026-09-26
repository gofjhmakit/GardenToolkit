import { useState } from 'react';
import { Database, Plus, Trash2 } from 'lucide-react';
import { usePlants } from '../../app/plantStore';
import { PlantBrowser } from '../plants/PlantBrowser';
import { Dialog } from '../components/Dialog';
import { CustomPlantForm } from '../plants/CustomPlantForm';
import { confirmAsync } from '../components/feedback';
import { t, tn } from '../../i18n';
import { plantDisplayName } from '../../plants/names';

export function PlantDatabaseView() {
  const { catalog, version } = usePlants();
  const [selected, setSelected] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const sel = selected ? catalog.get(selected) : undefined;
  void version;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="row pdb-header" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
        <h2 style={{ fontSize: 15 }}>{t('Plant database')}</h2>
        <span className="muted small pdb-blurb">{t('{{count}} plants · reference data is read-only and shared by all projects; your garden never changes it.', { count: catalog.plants.size.toLocaleString() })}</span>
        <span className="spacer" />
        {sel?.dataset === 'user' && (
          <button className="btn sm danger" onClick={async () => {
            if (await confirmAsync({ title: t('Delete custom plant?'), message: t('Delete "{{name}}" from My plants? Projects that use it keep their own copy only if exported beforehand.', { name: plantDisplayName(sel) }), danger: true, confirmLabel: t('Delete') })) {
              await usePlants.getState().deleteUserPlant(sel.id);
              setSelected(null);
            }
          }}>
            <Trash2 size={13} />{' '}{t('Delete my plant')}
          </button>
        )}
        <button className="btn sm" onClick={() => setCreateOpen(true)}>
          <Plus size={13} />{' '}{t('New custom plant')}
        </button>
        <button className="btn sm" onClick={() => setInfoOpen(true)}>
          <Database size={13} />{' '}{t('Data sources & licences')}
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <PlantBrowser selectedId={selected} onSelect={setSelected} />
      </div>
      <Dialog open={infoOpen} title={t('Plant data sources & licences')} onClose={() => setInfoOpen(false)}>
        <div className="col">
          <h4>{t('Datasets loaded')}</h4>
          <table className="table">
            <thead>
              <tr>
                <th>{t('Dataset')}</th>
                <th>{t('Origin')}</th>
                <th className="r">{t('Plants')}</th>
                <th>{t('Licence')}</th>
              </tr>
            </thead>
            <tbody>
              {catalog.datasets.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.title}</strong> <span className="muted tiny">v{d.version}</span>
                    {d.description && <div className="tiny muted">{d.description}</div>}
                    {d.rejected > 0 && <div className="tiny" style={{ color: 'var(--warn)' }}>{tn('{{count}} invalid records skipped', d.rejected)}</div>}
                  </td>
                  <td>{d.origin === 'bundled' ? t('Bundled with the app (works offline)') : t('Stored in this browser')}</td>
                  <td className="r num">{d.plantCount}</td>
                  <td>{d.license}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>{t('Sources')}</h4>
          {[...catalog.sources.values()].map((s) => (
            <div key={s.id} className="card small">
              <strong>{s.title}</strong> <span className="badge">{s.license}</span>
              {s.url && (
                <>
                  {' '}
                  <a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a>
                </>
              )}
              {s.notes && <p className="muted" style={{ marginTop: 4 }}>{s.notes}</p>}
            </div>
          ))}
          <p className="small">
            {t('The bundled dataset is a curated starter set. The data pipeline ({{scripts}}, see {{doc}}) can add larger, properly licensed datasets such as Wikidata (CC0) names in many languages. Proprietary databases are not copied. Values are ranges with confidence levels; unknown values stay unknown.', { scripts: 'scripts/', doc: 'docs/PLANT_DATA.md' })}
          </p>
        </div>
      </Dialog>
      {createOpen && <CustomPlantForm onClose={(id) => { setCreateOpen(false); if (id) setSelected(id); }} />}
    </div>
  );
}
