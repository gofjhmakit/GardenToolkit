import { useEffect, useRef } from 'react';
import { Lock, LockOpen, Eye, EyeOff, Sprout, Trash2, TreeDeciduous } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { compatibleKinds, kindInfo } from '../../domain/objectKinds';
import { IRRIGATION_TYPES, SOIL_TYPES, type GardenObject, type ObjectKind } from '../../domain/project';
import { shapeArea, shapePerimeter, dist, polylineLength } from '../../domain/geometry';
import { formatArea, formatLength, formatVolumeLitres, inputUnit } from '../../domain/units';
import { changeKind, deleteObjects, moveToLayer, updateObject } from '../../editor/commands';
import { Field, LengthInput, NumberInput, Select, TextInput, Checkbox } from '../components/Fields';
import { useObjectPlantings } from '../../app/computed';
import { PlantingCard } from './PlantingCard';
import { SUN_LEVELS } from '../../plants/schema';
import { SUN_LABEL } from '../../engine/suitability';
import { findCompanionRelations } from '../../engine/companions';
import { usePlants } from '../../app/plantStore';
import { CompanionList } from '../plants/CompanionList';
import type { Plant } from '../../plants/schema';

export const SOIL_LABELS: Record<(typeof SOIL_TYPES)[number], string> = {
  loam: 'Loam',
  clay: 'Clay',
  sandy: 'Sandy',
  silt: 'Silt',
  peat: 'Peat / organic',
  chalky: 'Chalky / alkaline',
  'potting-mix': 'Potting mix',
  'compost-rich': 'Compost-rich',
  unknown: 'Unknown',
};

export const IRRIGATION_LABELS: Record<(typeof IRRIGATION_TYPES)[number], string> = {
  none: 'None (rain only)',
  manual: 'Manual watering',
  drip: 'Drip irrigation',
  soaker: 'Soaker hose',
  sprinkler: 'Sprinkler',
  'self-watering': 'Self-watering',
};

/** Text object that should receive focus once its inspector mounts (set when a label is created). */
let pendingTextFocus: string | null = null;
export function requestTextFocus(id: string): void {
  pendingTextFocus = id;
  window.dispatchEvent(new CustomEvent('gtk:edit-text', { detail: { id } }));
}

export function ObjectInspector({ id }: { id: string }) {
  const doc = useEditor((s) => s.doc)!;
  const o = doc.objects[id];
  const comps = useObjectPlantings(id);
  const catalogCompanions = usePlants((s) => s.catalog.companions);
  const textRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focusText = () =>
      requestAnimationFrame(() => {
        const el = document.getElementById('obj-text') as HTMLInputElement | null;
        el?.focus();
        el?.select();
      });
    if (pendingTextFocus === id) {
      pendingTextFocus = null;
      focusText();
    }
    const on = (e: Event) => {
      if ((e as CustomEvent<{ id: string }>).detail.id === id) {
        pendingTextFocus = null;
        focusText();
      }
    };
    window.addEventListener('gtk:edit-text', on);
    return () => window.removeEventListener('gtk:edit-text', on);
  }, [id]);
  if (!o) return null;
  const info = kindInfo(o.kind);
  const units = doc.settings.unitSystem;
  const big = inputUnit(units, 'large');
  const small = inputUnit(units, 'small');
  const commit = (label: string, fn: (d: typeof doc) => void, key?: string) => useEditor.getState().commit(label, fn, key ? { coalesceKey: `${key}:${id}` } : undefined);
  const setProp = (patch: Partial<GardenObject['props']>, label = 'Edit property') => commit(label, (d) => updateObject(d, id, { props: patch }));
  const setShape = (fn: (s: GardenObject['shape']) => void, label = 'Resize') =>
    commit(label, (d) => {
      fn(d.objects[id].shape);
    });
  const area = shapeArea(o.shape);
  const perimeter = shapePerimeter(o.shape);
  const s = o.shape;
  const plantable = info.plantable;
  const isPlantSymbol = o.kind === 'tree' || o.kind === 'shrub';
  const plants = comps.map((c) => c.plant).filter((p): p is Plant => !!p);
  const companions = plants.length > 1 ? findCompanionRelations(plants, catalogCompanions) : [];

  return (
    <div>
      <div className="section">
        <div className="row">
          <span className="spacer" />
          <button className="icon-btn sm" aria-pressed={o.locked} title={o.locked ? 'Unlock' : 'Lock'} aria-label={o.locked ? 'Unlock object' : 'Lock object'} onClick={() => commit(o.locked ? 'Unlock' : 'Lock', (d) => void (d.objects[id].locked = !o.locked))}>
            {o.locked ? <Lock size={14} /> : <LockOpen size={14} />}
          </button>
          <button className="icon-btn sm" aria-pressed={o.hidden} title={o.hidden ? 'Show' : 'Hide'} aria-label={o.hidden ? 'Show object' : 'Hide object'} onClick={() => commit(o.hidden ? 'Show' : 'Hide', (d) => void (d.objects[id].hidden = !o.hidden))}>
            {o.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button className="icon-btn sm" title="Delete" aria-label="Delete object" disabled={o.locked} onClick={() => commit('Delete object', (d) => deleteObjects(d, [id]))}>
            <Trash2 size={14} />
          </button>
        </div>
        <div className="grid2" style={{ gridTemplateColumns: '1fr 80px' }}>
          <Field label="Name">{(fid) => <TextInput id={fid} value={o.name} onChange={(v) => commit('Rename', (d) => void (d.objects[id].name = v), 'name')} />}</Field>
          <Field label="Plan code">{(fid) => <TextInput id={fid} value={o.code} maxLength={20} onChange={(v) => commit('Edit code', (d) => void (d.objects[id].code = v), 'code')} />}</Field>
        </div>
        <div className="grid2">
          <Field label="Type">
            {(fid) => (
              <Select<ObjectKind>
                id={fid}
                value={o.kind}
                options={compatibleKinds(s.type).map((k) => ({ value: k.kind, label: k.label }))}
                onChange={(v) => v && commit('Change type', (d) => changeKind(d, [id], v))}
              />
            )}
          </Field>
          <Field label="Layer">
            {(fid) => (
              <Select<string>
                id={fid}
                value={o.layerId}
                options={doc.layers.filter((l) => l.role === 'content').map((l) => ({ value: l.id, label: l.name }))}
                onChange={(v) => v && commit('Move to layer', (d) => moveToLayer(d, [id], v))}
              />
            )}
          </Field>
        </div>
      </div>

      <div className="section">
        <h4>Size & position</h4>
        {s.type === 'rect' && (
          <div className="grid2">
            <Field label="Length (x)">{(fid) => <LengthInput id={fid} unit={big} valueMm={s.width} min={10} onCommit={(v) => v && setShape((sh) => void (sh.type === 'rect' && (sh.width = v)))} />}</Field>
            <Field label="Width (y)">{(fid) => <LengthInput id={fid} unit={big} valueMm={s.height} min={10} onCommit={(v) => v && setShape((sh) => void (sh.type === 'rect' && (sh.height = v)))} />}</Field>
          </div>
        )}
        {s.type === 'ellipse' && (
          <div className="grid2">
            <Field label={isPlantSymbol ? 'Canopy width (x)' : 'Diameter (x)'}>{(fid) => <LengthInput id={fid} unit={big} valueMm={s.rx * 2} min={10} onCommit={(v) => v && setShape((sh) => void (sh.type === 'ellipse' && (sh.rx = v / 2)))} />}</Field>
            <Field label={isPlantSymbol ? 'Canopy width (y)' : 'Diameter (y)'}>{(fid) => <LengthInput id={fid} unit={big} valueMm={s.ry * 2} min={10} onCommit={(v) => v && setShape((sh) => void (sh.type === 'ellipse' && (sh.ry = v / 2)))} />}</Field>
          </div>
        )}
        {s.type === 'polyline' && o.kind === 'path' && (
          <Field label="Path width">{(fid) => <LengthInput id={fid} unit={small} valueMm={s.width} min={50} onCommit={(v) => v && setShape((sh) => void (sh.type === 'polyline' && (sh.width = v)), 'Path width')} />}</Field>
        )}
        {s.type === 'text' && (
          <>
            <Field label="Text">{(fid) => <input ref={textRef} id="obj-text" aria-labelledby={fid} className="input" value={s.text} maxLength={500} onChange={(e) => commit('Edit text', (d) => void (d.objects[id].shape.type === 'text' && ((d.objects[id].shape as { text: string }).text = e.target.value)), 'text')} />}</Field>
            <Field label="Text height (real size)">{(fid) => <LengthInput id={fid} unit={small} valueMm={s.fontSize} min={10} onCommit={(v) => v && setShape((sh) => void (sh.type === 'text' && (sh.fontSize = v)), 'Text size')} />}</Field>
          </>
        )}
        {s.type === 'dimension' && (
          <Field label="Offset from measured points">{(fid) => <LengthInput id={fid} unit={big} valueMm={s.offset} min={-1e9} onCommit={(v) => v != null && setShape((sh) => void (sh.type === 'dimension' && (sh.offset = v)), 'Dimension offset')} />}</Field>
        )}
        <div className="grid3">
          <Field label="X">{(fid) => <LengthInput id={fid} unit={big} valueMm={o.transform.x} min={-1e12} onCommit={(v) => v != null && commit('Move', (d) => void (d.objects[id].transform.x = v))} />}</Field>
          <Field label="Y">{(fid) => <LengthInput id={fid} unit={big} valueMm={o.transform.y} min={-1e12} onCommit={(v) => v != null && commit('Move', (d) => void (d.objects[id].transform.y = v))} />}</Field>
          <Field label="Rotation">{(fid) => <NumberInput id={fid} value={Math.round(o.transform.rotation * 10) / 10} suffix="°" min={-360} max={360} onCommit={(v) => v != null && commit('Rotate', (d) => void (d.objects[id].transform.rotation = ((v % 360) + 360) % 360))} />}</Field>
        </div>
        <dl className="kv">
          {area > 0 && (
            <>
              <dt>Area</dt>
              <dd className="num">{formatArea(area, units)}</dd>
            </>
          )}
          {perimeter > 0 && (
            <>
              <dt>{s.type === 'polyline' || s.type === 'dimension' ? 'Length' : 'Perimeter'}</dt>
              <dd className="num">{formatLength(s.type === 'dimension' ? dist(s.a, s.b) : s.type === 'polyline' ? polylineLength(s.points) : perimeter, units)}</dd>
            </>
          )}
          {(s.type === 'polygon' || s.type === 'polyline') && (
            <>
              <dt>Points</dt>
              <dd>
                {s.points.length} ·{' '}
                <button className="btn ghost sm" onClick={() => useEditor.getState().setVertexEdit(id)}>
                  Edit points
                </button>
              </dd>
            </>
          )}
        </dl>
      </div>

      {(info.fields.length > 0 || plantable) && (
        <div className="section">
          <h4>Growing conditions</h4>
          {info.fields.includes('sun') && (
            <div className="grid2">
              <Field label="Sun exposure">
                {(fid) => (
                  <Select id={fid} value={o.props.sunLevel ?? ''} emptyLabel="Not set" options={SUN_LEVELS.map((l) => ({ value: l, label: SUN_LABEL[l] }))} onChange={(v) => setProp({ sunLevel: v }, 'Sun exposure')} />
                )}
              </Field>
              <Field label="Direct sun" hint="hours/day, if known">
                {(fid) => <NumberInput id={fid} value={o.props.sunHours} min={0} max={24} digits={1} suffix="h" allowEmpty onCommit={(v) => setProp({ sunHours: v }, 'Sun hours')} />}
              </Field>
            </div>
          )}
          {info.fields.includes('soil') && (
            <div className="grid2">
              <Field label="Soil">
                {(fid) => <Select id={fid} value={o.props.soil ?? ''} emptyLabel="Not set" options={SOIL_TYPES.map((t) => ({ value: t, label: SOIL_LABELS[t] }))} onChange={(v) => setProp({ soil: v }, 'Soil')} />}
              </Field>
              <Field label="Soil pH">{(fid) => <NumberInput id={fid} value={o.props.soilPh} min={0} max={14} digits={1} allowEmpty onCommit={(v) => setProp({ soilPh: v }, 'Soil pH')} />}</Field>
            </div>
          )}
          {info.fields.includes('irrigation') && (
            <Field label="Irrigation">
              {(fid) => <Select id={fid} value={o.props.irrigation ?? ''} emptyLabel="Not set" options={IRRIGATION_TYPES.map((t) => ({ value: t, label: IRRIGATION_LABELS[t] }))} onChange={(v) => setProp({ irrigation: v }, 'Irrigation')} />}
            </Field>
          )}
          {(info.fields.includes('material') || info.fields.includes('height')) && (
            <div className="grid2">
              {info.fields.includes('material') && <Field label="Material">{(fid) => <TextInput id={fid} value={o.props.material ?? ''} onChange={(v) => setProp({ material: v || null }, 'Material')} placeholder={o.kind === 'path' ? 'e.g. gravel, stone' : 'e.g. larch boards'} />}</Field>}
              {info.fields.includes('height') && <Field label="Height">{(fid) => <LengthInput id={fid} unit={small} valueMm={o.props.heightMm} allowEmpty onCommit={(v) => setProp({ heightMm: v }, 'Height')} />}</Field>}
            </div>
          )}
          {info.fields.includes('rowAxis') && (
            <Field label="Rows run along" hint="Direction of planting rows inside this area">
              {(fid) => (
                <Select<'auto' | 'x' | 'y'>
                  id={fid}
                  value={o.props.rowAxis ?? 'auto'}
                  options={[
                    { value: 'auto', label: 'Automatic (longest side)' },
                    { value: 'x', label: 'Length (local x)' },
                    { value: 'y', label: 'Width (local y)' },
                  ]}
                  onChange={(v) => setProp({ rowAxis: v ?? 'auto' }, 'Row direction')}
                />
              )}
            </Field>
          )}
          {o.props.heightMm && area > 0 && (o.kind === 'raised-bed' || o.kind === 'planter') && (
            <div className="callout">
              <div>
                <strong>Materials estimate</strong>
                <div className="small">
                  Soil/compost to fill: {formatVolumeLitres(area * o.props.heightMm)} · Edging length: {formatLength(perimeter, units)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {info.fields.includes('tree') && <TreeSection o={o} />}

      {plantable && (
        <div className="section">
          <div className="section-title">
            <h4 style={{ flex: 1 }}>{isPlantSymbol ? 'Species' : `Plants · ${doc.settings.activeSeason}`}</h4>
            <button className="btn sm primary" onClick={() => window.dispatchEvent(new CustomEvent('gtk:add-plants', { detail: { ids: [id] } }))}>
              {isPlantSymbol ? <TreeDeciduous size={13} /> : <Sprout size={13} />}
              {isPlantSymbol ? (comps.length ? 'Change' : 'Choose species') : 'Add plants'}
            </button>
          </div>
          {comps.length === 0 && <p className="muted small">{isPlantSymbol ? 'No species assigned yet.' : 'No plants assigned for this season yet.'}</p>}
          {comps.map((c) => (
            <PlantingCard key={c.planting.id} comp={c} siblings={comps.length} />
          ))}
          {companions.length > 0 && <CompanionList findings={companions} title="Companion notes for this area" />}
        </div>
      )}

      <div className="section">
        <h4>Notes</h4>
        <TextInput multiline rows={3} maxLength={20000} ariaLabel="Notes" value={o.props.notes ?? ''} onChange={(v) => commit('Edit notes', (d) => updateObject(d, id, { props: { notes: v } }), 'notes')} />
        <div className="row">
          <label className="field-label" htmlFor="obj-color">
            Colour
          </label>
          <input
            id="obj-color"
            type="color"
            value={o.style.fill && o.style.fill.startsWith('#') ? o.style.fill : info.fill.startsWith('#') ? info.fill : '#cccccc'}
            onChange={(e) => commit('Colour', (d) => updateObject(d, id, { style: { fill: e.target.value } }), 'color')}
          />
          {o.style.fill && (
            <button className="btn ghost sm" onClick={() => commit('Reset colour', (d) => updateObject(d, id, { style: { fill: null } }))}>
              Reset to default
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TreeSection({ o }: { o: GardenObject }) {
  const units = useEditor((s) => s.doc!.settings.unitSystem);
  const tree = o.props.tree ?? {};
  const big = inputUnit(units, 'large');
  const set = (patch: Partial<NonNullable<GardenObject['props']['tree']>>, label: string) =>
    useEditor.getState().commit(label, (d) => {
      d.objects[o.id].props.tree = { ...d.objects[o.id].props.tree, ...patch };
    });
  return (
    <div className="section">
      <h4>{o.kind === 'tree' ? 'Tree' : 'Shrub'} details</h4>
      <div className="grid2">
        <Field label="Planting date">{(fid) => <input id={fid} type="date" className="input" value={tree.plantingDate ?? ''} onChange={(e) => set({ plantingDate: e.target.value || null }, 'Planting date')} />}</Field>
        <Field label="Current height">{(fid) => <LengthInput id={fid} unit={big} valueMm={tree.currentHeightMm} allowEmpty onCommit={(v) => set({ currentHeightMm: v }, 'Current height')} />}</Field>
        <Field label="Current width">{(fid) => <LengthInput id={fid} unit={big} valueMm={tree.currentWidthMm} allowEmpty onCommit={(v) => set({ currentWidthMm: v }, 'Current width')} />}</Field>
        <Field label="Root zone radius">{(fid) => <LengthInput id={fid} unit={big} valueMm={tree.rootZoneRadiusMm} allowEmpty onCommit={(v) => set({ rootZoneRadiusMm: v, showRootZone: v != null }, 'Root zone')} />}</Field>
      </div>
      <Checkbox checked={!!tree.showRootZone} onChange={(v) => set({ showRootZone: v }, 'Toggle root zone')} label="Show root zone on plan" />
      <p className="muted tiny">The circle drawn on the plan represents the canopy. Mature size comes from the assigned species where known.</p>
    </div>
  );
}
