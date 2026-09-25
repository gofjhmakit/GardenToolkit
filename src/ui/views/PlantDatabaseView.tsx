import { useState } from 'react';
import { Database, Plus, Trash2 } from 'lucide-react';
import { usePlants } from '../../app/plantStore';
import { PlantBrowser } from '../plants/PlantBrowser';
import { Dialog } from '../components/Dialog';
import { CustomPlantForm } from '../plants/CustomPlantForm';
import { confirmAsync } from '../components/feedback';

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
        <h2 style={{ fontSize: 15 }}>Plant database</h2>
        <span className="muted small pdb-blurb">{catalog.plants.size.toLocaleString()} plants · reference data is read-only and shared by all projects; your garden never changes it.</span>
        <span className="spacer" />
        {sel?.dataset === 'user' && (
          <button className="btn sm danger" onClick={async () => {
            if (await confirmAsync({ title: 'Delete custom plant?', message: `Delete "${sel.names.common.en?.[0] ?? sel.id}" from My plants? Projects that use it keep their own copy only if exported beforehand.`, danger: true, confirmLabel: 'Delete' })) {
              await usePlants.getState().deleteUserPlant(sel.id);
              setSelected(null);
            }
          }}>
            <Trash2 size={13} /> Delete my plant
          </button>
        )}
        <button className="btn sm" onClick={() => setCreateOpen(true)}>
          <Plus size={13} /> New custom plant
        </button>
        <button className="btn sm" onClick={() => setInfoOpen(true)}>
          <Database size={13} /> Data sources & licences
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <PlantBrowser selectedId={selected} onSelect={setSelected} />
      </div>
      <Dialog open={infoOpen} title="Plant data sources & licences" onClose={() => setInfoOpen(false)}>
        <div className="col">
          <h4>Datasets loaded</h4>
          <table className="table">
            <thead>
              <tr>
                <th>Dataset</th>
                <th>Origin</th>
                <th className="r">Plants</th>
                <th>Licence</th>
              </tr>
            </thead>
            <tbody>
              {catalog.datasets.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.title}</strong> <span className="muted tiny">v{d.version}</span>
                    {d.description && <div className="tiny muted">{d.description}</div>}
                    {d.rejected > 0 && <div className="tiny" style={{ color: 'var(--warn)' }}>{d.rejected} invalid record(s) skipped</div>}
                  </td>
                  <td>{d.origin === 'bundled' ? 'Bundled with the app (works offline)' : 'Stored in this browser'}</td>
                  <td className="r num">{d.plantCount}</td>
                  <td>{d.license}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>Sources</h4>
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
            The bundled dataset is a curated starter set. The data pipeline (<code>scripts/</code>, see <code>docs/PLANT_DATA.md</code>) can add larger, properly licensed datasets such as
            Wikidata (CC0) names in many languages. Proprietary databases are not copied. Values are ranges with confidence levels; unknown values stay unknown.
          </p>
        </div>
      </Dialog>
      {createOpen && <CustomPlantForm onClose={(id) => { setCreateOpen(false); if (id) setSelected(id); }} />}
    </div>
  );
}
