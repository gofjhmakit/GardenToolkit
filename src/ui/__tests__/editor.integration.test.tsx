import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorShell } from '../editor/EditorShell';
import { FeedbackHost } from '../components/feedback';
import { useEditor, type Workspace } from '../../editor/store';
import { usePlants } from '../../app/plantStore';
import { loadCoreCatalog } from '../../test/fixtures';
import { createProject, makeObject } from '../../domain/projectFactory';
import { addObjects, assignPlant } from '../../editor/commands';

function openSample() {
  const doc = createProject('UI garden', { location: { lastFrost: '05-20', firstFrost: '09-25', country: 'Finland' } });
  const a = makeObject(doc, 'vegetable-bed', { x: 0, y: 0, rotation: 0 }, { type: 'rect', width: 3000, height: 1200 });
  const b = makeObject(doc, 'raised-bed', { x: 4000, y: 0, rotation: 0 }, { type: 'rect', width: 2400, height: 1200 }, { props: { heightMm: 300 } });
  const t = makeObject(doc, 'tree', { x: -4000, y: 0, rotation: 0 }, { type: 'ellipse', rx: 1500, ry: 1500 });
  const lawn = makeObject(doc, 'lawn', { x: 0, y: 4000, rotation: 0 }, { type: 'polygon', points: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 0, y: 2000 }] });
  addObjects(doc, [a, b, t, lawn]);
  assignPlant(doc, [a.id], 'daucus-carota-sativus');
  assignPlant(doc, [b.id], 'solanum-lycopersicum');
  assignPlant(doc, [t.id], 'malus-domestica');
  useEditor.getState().open(doc);
  return { doc, a, b, t, lawn };
}

function renderShell() {
  return render(
    <>
      <EditorShell onHome={() => undefined} />
      <FeedbackHost />
    </>,
  );
}

beforeEach(() => {
  usePlants.setState({ catalog: loadCoreCatalog(), version: 1, status: 'ready', favourites: new Set(), recents: [] });
});

describe('editor shell integration', () => {
  it.each<Workspace>(['design', 'plantings', 'calendar', 'harvest', 'care', 'rotation', 'plants', 'reports', 'settings'])('renders the %s workspace without errors', (w) => {
    openSample();
    renderShell();
    act(() => useEditor.getState().setWorkspace(w));
    expect(screen.getByRole('tab', { selected: true })).toBeInTheDocument();
    expect(document.body.textContent!.length).toBeGreaterThan(100);
  });

  it('inspector edits name with a single coalesced undo step, and edits dimensions in real units', async () => {
    const { a } = openSample();
    renderShell();
    act(() => useEditor.getState().setSelection([a.id]));
    const name = screen.getByLabelText('Name') as HTMLInputElement;
    await userEvent.clear(name);
    await userEvent.type(name, 'Carrot bed');
    expect(useEditor.getState().doc!.objects[a.id].name).toBe('Carrot bed');
    const length = screen.getByLabelText('Length (x)');
    await userEvent.clear(length);
    await userEvent.type(length, '400 cm{Enter}');
    const s = useEditor.getState().doc!.objects[a.id].shape;
    expect(s.type === 'rect' && s.width).toBe(4000);
    act(() => useEditor.getState().undo());
    act(() => useEditor.getState().undo());
    expect(useEditor.getState().doc!.objects[a.id].name).not.toBe('Carrot bed');
  });

  it('shows the planting calculator with calculated quantity and keeps a user override', async () => {
    const { a } = openSample();
    renderShell();
    act(() => useEditor.getState().setSelection([a.id]));
    expect(screen.getByText(/Calculated:/)).toBeInTheDocument();
    const qty = screen.getByLabelText('Your quantity');
    await userEvent.type(qty, '123{Enter}');
    const p = Object.values(useEditor.getState().doc!.plantings).find((x) => x.objectId === a.id)!;
    expect(p.quantityOverride).toBe(123);
    expect(screen.getByText('your value')).toBeInTheDocument();
    expect(screen.getByText(/How was this calculated/)).toBeInTheDocument();
  });

  it('shows the materials estimate for raised beds and multi-selection totals', () => {
    const { a, b } = openSample();
    renderShell();
    act(() => useEditor.getState().setSelection([b.id]));
    expect(screen.getByText(/Materials estimate/)).toBeInTheDocument();
    expect(screen.getByText(/Soil\/compost to fill/)).toBeInTheDocument();
    act(() => useEditor.getState().setSelection([a.id, b.id]));
    expect(screen.getByRole('button', { name: /Add the same plant to 2 areas/ })).toBeInTheDocument();
    expect(within(screen.getByRole('complementary', { name: 'Inspector' })).getByText(/6.48 m²/)).toBeInTheDocument();
  });

  it('adds a plant to several beds through the dialog with a quantity preview', async () => {
    const { a, b } = openSample();
    renderShell();
    act(() => useEditor.getState().setSelection([a.id, b.id]));
    await userEvent.click(screen.getByRole('button', { name: /Add plants \(2\)/ }));
    const search = await screen.findByLabelText('Search plants');
    await userEvent.type(search, 'lettuce');
    const add = await screen.findByRole('button', { name: /Add Lettuce to 2 areas/ });
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    await userEvent.click(add);
    const lettuce = Object.values(useEditor.getState().doc!.plantings).filter((p) => p.plantId === 'lactuca-sativa');
    expect(lettuce.map((p) => p.objectId).sort()).toEqual([a.id, b.id].sort());
    expect(usePlants.getState().recents[0]).toBe('lactuca-sativa');
  });

  it('layers panel toggles visibility and lock with undo', async () => {
    openSample();
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Hide layer Beds & areas' }));
    expect(useEditor.getState().doc!.layers.find((l) => l.id === 'layer-beds')!.visible).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Lock layer Trees' }));
    expect(useEditor.getState().doc!.layers.find((l) => l.id === 'layer-trees')!.locked).toBe(true);
    act(() => useEditor.getState().undo());
    act(() => useEditor.getState().undo());
    expect(useEditor.getState().doc!.layers.find((l) => l.id === 'layer-beds')!.visible).toBe(true);
  });

  it('filters objects in the layers panel and selects from the list', async () => {
    const { t } = openSample();
    renderShell();
    await userEvent.type(screen.getByLabelText('Filter objects'), 'tree');
    const btn = within(screen.getByRole('complementary', { name: 'Layers and objects' })).getByTitle('Tree');
    await userEvent.click(btn);
    expect(useEditor.getState().selection).toEqual([t.id]);
  });

  it('keyboard shortcuts: select all, duplicate, delete, undo, tool keys', () => {
    openSample();
    renderShell();
    const fire = (key: string, extra: Partial<KeyboardEventInit> = {}) => act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...extra })));
    fire('a', { ctrlKey: true });
    expect(useEditor.getState().selection).toHaveLength(4);
    fire('d', { ctrlKey: true });
    expect(Object.keys(useEditor.getState().doc!.objects)).toHaveLength(8);
    fire('Delete');
    expect(Object.keys(useEditor.getState().doc!.objects)).toHaveLength(4);
    fire('z', { ctrlKey: true });
    expect(Object.keys(useEditor.getState().doc!.objects)).toHaveLength(8);
    fire('r');
    expect(useEditor.getState().tool).toBe('rect');
    fire('Escape');
    expect(useEditor.getState().tool).toBe('select');
    fire('ArrowRight', { shiftKey: true });
  });

  it('calendar view: mark done, add a custom task, hide and restore an event', async () => {
    openSample();
    renderShell();
    act(() => useEditor.getState().setWorkspace('calendar'));
    const boxes = screen.getAllByRole('checkbox', { name: /Mark ".*" done/ });
    await userEvent.click(boxes[0]);
    expect(Object.values(useEditor.getState().doc!.calendarOverrides).some((o) => o.done)).toBe(true);
    await userEvent.type(screen.getByLabelText('Task title'), 'Order seed potatoes');
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));
    expect(useEditor.getState().doc!.customTasks[0].title).toBe('Order seed potatoes');
    await userEvent.click(screen.getAllByRole('button', { name: 'Hide event' })[0]);
    await userEvent.click(await screen.findByRole('button', { name: /Restore \d+ hidden/ }));
  });

  it('settings: applying a climate preset fills frost dates', async () => {
    openSample();
    renderShell();
    act(() => useEditor.getState().setWorkspace('settings'));
    await userEvent.selectOptions(screen.getByLabelText('Quick preset'), 'fi-IV');
    expect(useEditor.getState().doc!.location).toMatchObject({ climateZone: 'IV', lastFrost: '05-30', firstFrost: '09-15' });
  });

  it('rotation view records history', async () => {
    openSample();
    renderShell();
    act(() => useEditor.getState().setWorkspace('rotation'));
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(useEditor.getState().doc!.rotationHistory).toHaveLength(1);
  });

  it('plantings view lets you override quantities inline', async () => {
    openSample();
    renderShell();
    act(() => useEditor.getState().setWorkspace('plantings'));
    const inputs = screen.getAllByLabelText(/Your quantity for/);
    await userEvent.type(inputs[0], '42{Enter}');
    expect(Object.values(useEditor.getState().doc!.plantings).some((p) => p.quantityOverride === 42)).toBe(true);
  });

  it('context menu and menu bar open and are keyboard accessible', async () => {
    const { a } = openSample();
    renderShell();
    act(() => useEditor.getState().setSelection([a.id]));
    act(() => void window.dispatchEvent(new CustomEvent('gtk:context-menu', { detail: { x: 10, y: 10 } })));
    expect(screen.getByRole('menu', { name: 'Context menu' })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('menu', { name: 'Context menu' }), { key: 'Escape' });
    await userEvent.click(screen.getByRole('button', { name: 'Arrange' }));
    expect(screen.getByRole('menuitem', { name: /Bring to front/ })).toBeInTheDocument();
  });
});
