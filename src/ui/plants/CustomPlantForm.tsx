import { useState } from 'react';
import { Dialog } from '../components/Dialog';
import { Field, Select, TextInput, NumberInput } from '../components/Fields';
import { PLANT_CATEGORIES, PLANTING_METHODS, PlantSchema, SUN_LEVELS, type PlantCategory, type PlantingMethod, type SunLevel } from '../../plants/schema';
import { CATEGORY_LABELS } from '../plantColors';
import { METHOD_LABELS } from '../panels/PlantingCard';
import { SUN_LABEL } from '../../engine/suitability';
import { usePlants } from '../../app/plantStore';
import { newId } from '../../lib/ids';
import { toast } from '../components/feedback';

/** Creates a user-defined plant stored in this browser ("My plants"). */
export function CustomPlantForm({ onClose }: { onClose: (id?: string) => void }) {
  const [name, setName] = useState('');
  const [sci, setSci] = useState('');
  const [category, setCategory] = useState<PlantCategory>('vegetable');
  const [method, setMethod] = useState<PlantingMethod>('spaced');
  const [sun, setSun] = useState<SunLevel | null>('full-sun');
  const [spMin, setSpMin] = useState<number | null>(null);
  const [spMax, setSpMax] = useState<number | null>(null);
  const [rowMin, setRowMin] = useState<number | null>(null);
  const [rowMax, setRowMax] = useState<number | null>(null);
  const [dtm, setDtm] = useState<number | null>(null);
  const [yieldPlant, setYieldPlant] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const range = (a: number | null, b: number | null) => (a == null && b == null ? null : { min: Math.min(a ?? b!, b ?? a!), max: Math.max(a ?? b!, b ?? a!) });
  const save = async () => {
    const id = `user-${newId().slice(0, 8)}`;
    const raw = {
      id,
      dataset: 'user',
      names: { scientific: sci.trim() || name.trim(), common: { en: [name.trim()] }, synonyms: [] },
      taxonomy: { genus: sci.trim().split(' ')[0] || null, species: sci.trim().split(' ')[1] || null },
      category,
      tags: ['my-plant'],
      growing: { sun: sun ? [sun] : null },
      planting: { methods: [method], inRowSpacingCm: range(spMin, spMax), rowSpacingCm: range(rowMin, rowMax) },
      timing: { daysToMaturity: dtm ? { min: dtm, max: dtm } : null, maturityFrom: 'sowing' },
      care: { watering: notes ? { en: notes } : null },
      yield: yieldPlant ? { perPlantKg: { min: yieldPlant, max: yieldPlant }, confidence: 'unknown', assumptions: { en: 'Entered by you.' } } : null,
      provenance: { sources: [{ id: 'user', note: 'Entered by the user' }], confidence: 'unknown', updated: new Date().toISOString().slice(0, 10) },
    };
    const res = PlantSchema.safeParse(raw);
    if (!res.success) {
      toast('error', 'Could not save the plant', res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
      return;
    }
    await usePlants.getState().saveUserPlant(res.data);
    toast('ok', `Saved "${name}" to My plants`);
    onClose(id);
  };
  return (
    <Dialog
      open
      title="New custom plant"
      onClose={() => onClose()}
      footer={
        <>
          <button className="btn" onClick={() => onClose()}>Cancel</button>
          <button className="btn primary" disabled={!name.trim()} onClick={save}>Save plant</button>
        </>
      }
    >
      <div className="col">
        <p className="small muted">Custom plants are stored only in this browser and embedded in project exports that use them. Leave values empty if unknown — calculations will say so instead of guessing.</p>
        <div className="grid2">
          <Field label="Common name *">{(id) => <TextInput id={id} value={name} onChange={setName} />}</Field>
          <Field label="Scientific name">{(id) => <TextInput id={id} value={sci} onChange={setSci} placeholder="Genus species" />}</Field>
          <Field label="Category">{(id) => <Select id={id} value={category} options={PLANT_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))} onChange={(v) => v && setCategory(v)} />}</Field>
          <Field label="Planting method">{(id) => <Select id={id} value={method} options={PLANTING_METHODS.map((m) => ({ value: m, label: METHOD_LABELS[m] }))} onChange={(v) => v && setMethod(v)} />}</Field>
          <Field label="Light">{(id) => <Select id={id} value={sun ?? ''} emptyLabel="Unknown" options={SUN_LEVELS.map((s) => ({ value: s, label: SUN_LABEL[s] }))} onChange={setSun} />}</Field>
          <Field label="Days to maturity">{(id) => <NumberInput id={id} value={dtm} integer min={1} allowEmpty onCommit={setDtm} suffix="days" />}</Field>
          <Field label="Plant spacing min–max (cm)">{(id) => <div className="row"><NumberInput id={id} value={spMin} min={0.5} allowEmpty onCommit={setSpMin} /><NumberInput ariaLabel="Plant spacing max" value={spMax} min={0.5} allowEmpty onCommit={setSpMax} /></div>}</Field>
          <Field label="Row spacing min–max (cm)">{(id) => <div className="row"><NumberInput id={id} value={rowMin} min={1} allowEmpty onCommit={setRowMin} /><NumberInput ariaLabel="Row spacing max" value={rowMax} min={1} allowEmpty onCommit={setRowMax} /></div>}</Field>
          <Field label="Yield per plant (kg)">{(id) => <NumberInput id={id} value={yieldPlant} min={0} allowEmpty onCommit={setYieldPlant} />}</Field>
        </div>
        <Field label="Care notes">{(id) => <TextInput id={id} multiline value={notes} onChange={setNotes} maxLength={5000} />}</Field>
      </div>
    </Dialog>
  );
}
