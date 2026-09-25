import { expect, test } from '@playwright/test';
import { drag, drawRectMm, focusCanvas, mod, newGarden, objects, selection, setSnapping, state, toPage } from './helpers';

test.describe('CAD-style editing', () => {
  test.beforeEach(async ({ page }) => {
    await newGarden(page);
    await drawRectMm(page, 1000, 1000, 3000, 2000); // B1
    await drawRectMm(page, 4000, 1000, 6000, 2000); // B2
    await drawRectMm(page, 1000, 3000, 3000, 4000); // B3
    await page.keyboard.press('Escape');
  });

  const byCode = async (page: any, code: string) => (await objects(page)).find((o: any) => o.code === code);

  test('drag moves an object by exact grid steps and is one undo step', async ({ page }) => {
    const before = await byCode(page, 'B1');
    await drag(page, await toPage(page, 2000, 1500), await toPage(page, 2510, 2020));
    const after = await byCode(page, 'B1');
    expect(after.transform.x - before.transform.x).toBe(500);
    expect(after.transform.y - before.transform.y).toBe(500);
    await focusCanvas(page);
    await page.keyboard.press(`${mod}+z`);
    expect((await byCode(page, 'B1')).transform).toEqual(before.transform);
  });

  test('snapping can be switched off in the status bar', async ({ page }) => {
    await page.getByRole('button', { name: /Snap on/ }).click();
    await expect(page.getByRole('button', { name: /Snap off/ })).toBeVisible();
    const before = await byCode(page, 'B1');
    await drag(page, await toPage(page, 2000, 1500), await toPage(page, 2130, 1570));
    const after = await byCode(page, 'B1');
    expect(Math.round(after.transform.x - before.transform.x)).toBe(130);
  });

  test('Shift constrains a drag to one axis', async ({ page }) => {
    await setSnapping(page, false);
    const before = await byCode(page, 'B1');
    // Shift is pressed after the drag starts (Shift at pointer-down toggles selection).
    const a = await toPage(page, 2000, 1500);
    const b = await toPage(page, 3000, 1650);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(a.x + 20, a.y + 5, { steps: 2 });
    await page.keyboard.down('Shift');
    await page.mouse.move(b.x, b.y, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    const after = await byCode(page, 'B1');
    expect(after.transform.y).toBe(before.transform.y);
    expect(after.transform.x).toBeGreaterThan(before.transform.x);
  });

  test('Alt-drag duplicates', async ({ page }) => {
    await page.keyboard.down('Alt');
    await drag(page, await toPage(page, 2000, 1500), await toPage(page, 2000, 6000));
    await page.keyboard.up('Alt');
    expect(await objects(page)).toHaveLength(4);
    expect((await byCode(page, 'B1')).transform.y).toBe(1500);
  });

  test('Shift-click toggles and Ctrl-click adds to the selection; marquee selects', async ({ page }) => {
    const c1 = await toPage(page, 2000, 1500);
    const c2 = await toPage(page, 5000, 1500);
    await page.mouse.click(c1.x, c1.y);
    await page.keyboard.down('Shift');
    await page.mouse.click(c2.x, c2.y);
    await page.keyboard.up('Shift');
    expect(await selection(page)).toHaveLength(2);
    await page.keyboard.down('Shift');
    await page.mouse.click(c2.x, c2.y);
    await page.keyboard.up('Shift');
    expect(await selection(page)).toHaveLength(1);
    await page.keyboard.down(mod === 'Meta' ? 'Meta' : 'Control');
    await page.mouse.click(c2.x, c2.y);
    await page.keyboard.up(mod === 'Meta' ? 'Meta' : 'Control');
    expect(await selection(page)).toHaveLength(2);
    // Marquee over empty space in the middle of B1..B3 selects all three.
    await drag(page, await toPage(page, 500, 500), await toPage(page, 6500, 4500));
    expect(await selection(page)).toHaveLength(3);
    // Clicking empty space clears.
    const empty = await toPage(page, 7500, 6000);
    await page.mouse.click(empty.x, empty.y);
    expect(await selection(page)).toHaveLength(0);
  });

  test('resize handle changes real dimensions; Shift keeps aspect', async ({ page }) => {
    await setSnapping(page, false);
    const c = await toPage(page, 2000, 1500);
    await page.mouse.click(c.x, c.y);
    // SE handle of B1 (3000, 2000) → (4000, 2500)
    await drag(page, await toPage(page, 3000, 2000), await toPage(page, 4000, 2500));
    let b1 = await byCode(page, 'B1');
    expect(b1.shape.width).toBeCloseTo(3000, -1);
    expect(b1.shape.height).toBeCloseTo(1500, -1);
    await page.keyboard.down('Shift');
    await drag(page, await toPage(page, 4000, 2500), await toPage(page, 5000, 2600));
    await page.keyboard.up('Shift');
    b1 = await byCode(page, 'B1');
    expect(b1.shape.width / b1.shape.height).toBeCloseTo(2, 1);
  });

  test('rotation handle with Shift snaps to 15°', async ({ page }) => {
    const c = await toPage(page, 2000, 1500);
    await page.mouse.click(c.x, c.y);
    const view = await state<any>(page, '(s) => s.view');
    const top = await toPage(page, 2000, 1000);
    const handle = { x: top.x, y: top.y - 26 };
    void view;
    await page.keyboard.down('Shift');
    await drag(page, handle, await toPage(page, 4200, 1500), 12);
    await page.keyboard.up('Shift');
    const r = (await byCode(page, 'B1')).transform.rotation;
    expect(r % 15).toBeCloseTo(0, 5);
    expect(r).toBeGreaterThan(0);
  });

  test('group, then clicking one member selects the group; ungroup', async ({ page }) => {
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press(`${mod}+g`);
    await page.keyboard.press('Escape');
    const c = await toPage(page, 2000, 1500);
    await page.mouse.click(c.x, c.y);
    expect(await selection(page)).toHaveLength(3);
    await page.keyboard.press(`${mod}+Shift+g`);
    await page.keyboard.press('Escape');
    await page.mouse.click(c.x, c.y);
    expect(await selection(page)).toHaveLength(1);
  });

  test('locked objects cannot be selected on the canvas but can from the layers panel', async ({ page }) => {
    const c = await toPage(page, 2000, 1500);
    await page.mouse.click(c.x, c.y);
    await page.keyboard.press(`${mod}+Shift+l`);
    await page.keyboard.press('Escape');
    await page.mouse.click(c.x, c.y);
    expect(await selection(page)).toHaveLength(0);
    await page.getByRole('complementary', { name: 'Layers and objects' }).getByRole('button', { name: 'Garden bed 1', exact: true }).click();
    expect(await selection(page)).toHaveLength(1);
    // Locked: Delete does nothing.
    await focusCanvas(page);
    await page.keyboard.press('Delete');
    expect(await objects(page)).toHaveLength(3);
  });

  test('hidden layers are not hit-testable', async ({ page }) => {
    // Row buttons appear on hover/focus.
    await page.getByRole('treeitem', { name: /Beds & areas/ }).locator('.tree-row').first().hover();
    await page.getByRole('button', { name: 'Hide layer Beds & areas' }).click();
    const c = await toPage(page, 2000, 1500);
    await page.mouse.click(c.x, c.y);
    expect(await selection(page)).toHaveLength(0);
  });

  test('arrow keys nudge 1 cm, Shift+arrow one grid step', async ({ page }) => {
    const c = await toPage(page, 2000, 1500);
    await page.mouse.click(c.x, c.y);
    const before = await byCode(page, 'B1');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowDown');
    const after = await byCode(page, 'B1');
    expect(after.transform.x - before.transform.x).toBe(10);
    expect(after.transform.y - before.transform.y).toBe(500);
  });

  test('z-order and align via the Arrange menu', async ({ page }) => {
    const c = await toPage(page, 2000, 1500);
    await page.mouse.click(c.x, c.y);
    await page.getByRole('button', { name: 'Arrange' }).click();
    await page.getByRole('menuitem', { name: /Bring to front/ }).click();
    const order = await state<string[]>(page, "(s) => s.doc.layers.find((l) => l.id === 'layer-beds').objectIds");
    expect(order[order.length - 1]).toBe((await byCode(page, 'B1')).id);
    await page.keyboard.press(`${mod}+a`);
    await page.getByRole('button', { name: 'Arrange' }).click();
    await page.getByRole('menuitem', { name: 'Align left edges' }).click();
    const xs = (await objects(page)).map((o: any) => o.transform.x - o.shape.width / 2);
    expect(new Set(xs).size).toBe(1);
  });

  test('double-click a polygon to edit points; double-click an edge adds a point', async ({ page }) => {
    await page.getByLabel('Object type to draw').selectOption('lawn');
    await focusCanvas(page);
    await page.keyboard.press('p');
    for (const [x, y] of [[1000, 5000], [5000, 5000], [3000, 7000]]) {
      const p = await toPage(page, x, y);
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(400);
    }
    await page.keyboard.press('Enter');
    await page.keyboard.press('v');
    const inside = await toPage(page, 3000, 5600);
    await page.mouse.dblclick(inside.x, inside.y);
    expect(await state<string | null>(page, '(s) => s.vertexEditId')).not.toBeNull();
    const edge = await toPage(page, 3000, 5000);
    await page.mouse.dblclick(edge.x, edge.y);
    const lawn = (await objects(page)).find((o: any) => o.kind === 'lawn');
    expect(lawn.shape.points).toHaveLength(4);
    // Drag the new vertex
    await drag(page, edge, await toPage(page, 3000, 4500));
    const moved = (await objects(page)).find((o: any) => o.kind === 'lawn');
    const minY = Math.min(...moved.shape.points.map((p: any) => p.y + moved.transform.y));
    expect(minY).toBeCloseTo(4500, -1);
  });

  test('context menu offers delete and add plants', async ({ page }) => {
    const c = await toPage(page, 2000, 1500);
    await page.mouse.click(c.x, c.y);
    await page.mouse.click(c.x, c.y, { button: 'right' });
    await expect(page.getByRole('menu', { name: 'Context menu' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Add plants to this area/ })).toBeVisible();
    await page.getByRole('menuitem', { name: /^Delete/ }).click();
    expect(await objects(page)).toHaveLength(2);
  });

  test('cut and paste moves objects between projects via the system clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const c = await toPage(page, 2000, 1500);
    await page.mouse.click(c.x, c.y);
    await focusCanvas(page);
    await page.keyboard.press(`${mod}+x`);
    expect(await objects(page)).toHaveLength(2);
    await newGarden(page, 'Second');
    await focusCanvas(page);
    await page.keyboard.press(`${mod}+v`);
    expect(await objects(page)).toHaveLength(1);
  });

  test('zoom never changes stored dimensions; fit and zoom buttons work', async ({ page }) => {
    const before = await objects(page);
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.mouse.move(700, 400);
    await page.mouse.wheel(0, -500);
    await page.getByRole('button', { name: 'Fit to screen' }).click();
    const scale = await state<number>(page, '(s) => s.view.scale');
    expect(scale).toBeGreaterThan(0.1);
    expect(await objects(page)).toEqual(before);
    await expect(page.getByText(/Zoom \d+%/)).toBeVisible();
  });
});
