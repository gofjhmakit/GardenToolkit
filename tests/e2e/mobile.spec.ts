/**
 * Phone layout and touch input (runs in the "phone" project: 402 × 874, touch).
 * Touches are sent through the Chrome DevTools protocol so multi-finger gestures are real.
 */
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { objects, state } from './helpers';

type Pt = { x: number; y: number; id?: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function touchApi(page: Page) {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', pts: Pt[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i })) });
  return {
    send,
    async tap(p: Pt) {
      await send('touchStart', [p]);
      await sleep(40);
      await send('touchEnd', []);
      await sleep(400);
    },
    async drag(a: Pt, b: Pt, steps = 10) {
      await send('touchStart', [a]);
      for (let i = 1; i <= steps; i++) {
        await send('touchMove', [{ x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps }]);
        await sleep(16);
      }
      await send('touchEnd', []);
      await sleep(400);
    },
    async pinch(c: Pt, from: number, to: number, steps = 10) {
      await send('touchStart', [{ x: c.x - from, y: c.y, id: 1 }]);
      await sleep(20);
      await send('touchStart', [{ x: c.x - from, y: c.y, id: 1 }, { x: c.x + from, y: c.y, id: 2 }]);
      for (let i = 1; i <= steps; i++) {
        const d = from + ((to - from) * i) / steps;
        await send('touchMove', [{ x: c.x - d, y: c.y, id: 1 }, { x: c.x + d, y: c.y, id: 2 }]);
        await sleep(16);
      }
      await send('touchEnd', []);
      await sleep(300);
    },
  };
}

async function newPhoneGarden(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New garden' }).first().tap();
  await page.locator('#new-name').fill('Phone garden');
  await page.getByRole('button', { name: 'Create garden' }).tap();
  await expect(page.getByRole('application')).toBeVisible();
  await page.evaluate(() => (window as any).__gtk.editor.getState().setView({ scale: 0.1, x: 0, y: 0 }));
  await sleep(300);
}

async function canvas(page: Page) {
  const b = await page.locator('svg.canvas-svg').boundingBox();
  if (!b) throw new Error('no canvas');
  return b;
}

async function noHorizontalOverflow(page: Page) {
  const [scrollW, innerW] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scrollW).toBeLessThanOrEqual(innerW);
}

test('home screen and every workspace fit the phone width', async ({ page }) => {
  await page.goto('/');
  await noHorizontalOverflow(page);
  await newPhoneGarden(page);
  await noHorizontalOverflow(page);
  // The canvas gets the full width on phones.
  expect((await canvas(page)).width).toBeGreaterThan(390);
  for (const tab of await page.getByRole('tab').all()) {
    await tab.tap();
    await sleep(250);
    await noHorizontalOverflow(page);
  }
});

test('draw, select, move, pinch-zoom and pan with fingers', async ({ page }) => {
  await newPhoneGarden(page);
  const t = await touchApi(page);
  const c = await canvas(page);
  await page.getByRole('button', { name: 'Draw a bed' }).tap();
  await t.drag({ x: c.x + 60, y: c.y + 120 }, { x: c.x + 260, y: c.y + 300 });
  expect(await objects(page)).toHaveLength(1);

  await page.getByRole('button', { name: /^Select/ }).tap();
  await t.tap({ x: c.x + 20, y: c.y + 500 });
  expect(await state(page, '(s) => s.selection.length')).toBe(0);
  await t.tap({ x: c.x + 160, y: c.y + 210 });
  expect(await state(page, '(s) => s.selection.length')).toBe(1);

  await page.evaluate(() => (window as any).__gtk.editor.getState().setSnapping(false));
  const x0 = (await objects(page))[0].transform.x;
  await t.drag({ x: c.x + 160, y: c.y + 210 }, { x: c.x + 260, y: c.y + 210 });
  expect((await objects(page))[0].transform.x - x0).toBeCloseTo(1000, -1); // 100 px at 100 % = 1 m

  // Two fingers zoom without drawing, moving or selecting anything.
  const undoDepth = await state<number>(page, '(s) => s.past.length');
  const before = JSON.stringify(await objects(page));
  await t.pinch({ x: c.x + c.width / 2, y: c.y + c.height / 2 }, 40, 120);
  expect(await state<number>(page, '(s) => s.view.scale')).toBeGreaterThan(0.2);
  expect(JSON.stringify(await objects(page))).toBe(before);
  expect(await state<number>(page, '(s) => s.past.length')).toBe(undoDepth);

  // One finger on empty canvas pans.
  const vx = await state<number>(page, '(s) => s.view.x');
  await t.drag({ x: c.x + 30, y: c.y + c.height - 60 }, { x: c.x + 130, y: c.y + c.height - 60 });
  expect((await state<number>(page, '(s) => s.view.x')) - vx).toBeCloseTo(100, 0);
  expect(await objects(page)).toHaveLength(1);
});

test('long-press opens the context menu without choosing an item', async ({ page }) => {
  await newPhoneGarden(page);
  const t = await touchApi(page);
  const c = await canvas(page);
  await page.getByRole('button', { name: 'Draw a bed' }).tap();
  await t.drag({ x: c.x + 60, y: c.y + 120 }, { x: c.x + 260, y: c.y + 300 });
  await page.getByRole('button', { name: /^Select/ }).tap();
  await t.send('touchStart', [{ x: c.x + 160, y: c.y + 210 }]);
  await sleep(750);
  await t.send('touchEnd', []);
  await sleep(300);
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  // Lifting the finger must not have run the item under it.
  expect(await objects(page)).toHaveLength(1);
  expect(await state(page, '(s) => s.past.length')).toBe(1);
  await page.getByRole('menuitem', { name: 'Duplicate' }).tap();
  expect(await objects(page)).toHaveLength(2);
});

test('polygon by taps, finished with the Finish button', async ({ page }) => {
  await newPhoneGarden(page);
  const t = await touchApi(page);
  const c = await canvas(page);
  await page.evaluate(() => (window as any).__gtk.editor.getState().setTool('polygon', 'bed'));
  await sleep(100);
  for (const [x, y] of [[60, 80], [260, 80], [220, 260]]) await t.tap({ x: c.x + x, y: c.y + y });
  await page.getByRole('button', { name: 'Finish shape' }).tap();
  const objs = await objects(page);
  expect(objs).toHaveLength(1);
  expect(objs[0].shape.type).toBe('polygon');
  expect(objs[0].shape.points).toHaveLength(3);
  await expect(page.getByRole('button', { name: 'Finish shape' })).toHaveCount(0);
});

test('layers and details open as bottom sheets', async ({ page }) => {
  await newPhoneGarden(page);
  const t = await touchApi(page);
  const c = await canvas(page);
  await page.getByRole('button', { name: 'Draw a bed' }).tap();
  await t.drag({ x: c.x + 60, y: c.y + 120 }, { x: c.x + 260, y: c.y + 300 });

  await page.getByRole('button', { name: 'Details (1)' }).tap();
  const sheet = page.getByRole('region', { name: 'Details' });
  await expect(sheet).toBeVisible();
  await sheet.getByLabel('Name').fill('Herb bed');
  await page.getByRole('button', { name: 'Close details' }).tap();
  await expect(sheet).toHaveCount(0);
  expect((await objects(page))[0].name).toBe('Herb bed');

  await page.getByRole('button', { name: 'Layers' }).tap();
  const layers = page.getByRole('region', { name: 'Layers' });
  await expect(layers.getByText('Herb bed')).toBeVisible();
  await page.getByRole('button', { name: 'Close layers' }).tap();
  await expect(layers).toHaveCount(0);
});

test('add plants: tap a plant to see the preview, then add', async ({ page }) => {
  await newPhoneGarden(page);
  const t = await touchApi(page);
  const c = await canvas(page);
  await page.getByRole('button', { name: 'Draw a bed' }).tap();
  await t.drag({ x: c.x + 60, y: c.y + 120 }, { x: c.x + 260, y: c.y + 300 });
  await page.getByRole('button', { name: 'Add plants' }).tap();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Search plants').fill('lettuce');
  await dialog.locator('.plant-item').first().tap();
  // Two taps in quick succession must not add the plant by themselves.
  await sleep(300);
  expect(await state(page, '(s) => Object.keys(s.doc.plantings).length')).toBe(0);
  await expect(dialog.getByRole('button', { name: 'All plants' })).toBeVisible();
  await dialog.getByRole('button', { name: /^Add .* to 1 area$/ }).tap();
  await expect(dialog).toHaveCount(0);
  expect(await state(page, '(s) => Object.keys(s.doc.plantings).length')).toBe(1);
});

test('plant database: filters and details are separate panes', async ({ page }) => {
  await newPhoneGarden(page);
  await page.getByRole('tab', { name: 'Plant database' }).tap();
  await page.getByRole('button', { name: /^Filters/ }).tap();
  await expect(page.getByRole('button', { name: /Show \d+ plants/ })).toBeVisible();
  await expect(page.getByRole('listbox', { name: 'Plants' })).toBeHidden();
  await page.getByRole('button', { name: /Show \d+ plants/ }).tap();
  await page.locator('.plant-item').first().tap();
  await expect(page.getByRole('button', { name: 'All plants' })).toBeVisible();
  await expect(page.getByRole('listbox', { name: 'Plants' })).toBeHidden();
  await page.getByRole('button', { name: 'All plants' }).tap();
  await expect(page.getByRole('listbox', { name: 'Plants' })).toBeVisible();
  await noHorizontalOverflow(page);
});

test('single menu button holds all menus; undo and redo are in the toolbar', async ({ page }) => {
  await newPhoneGarden(page);
  const t = await touchApi(page);
  const c = await canvas(page);
  await page.getByRole('button', { name: 'Draw a bed' }).tap();
  await t.drag({ x: c.x + 60, y: c.y + 120 }, { x: c.x + 260, y: c.y + 300 });
  await page.getByRole('button', { name: 'Undo' }).tap();
  expect(await objects(page)).toHaveLength(0);
  await page.getByRole('button', { name: 'Redo' }).tap();
  expect(await objects(page)).toHaveLength(1);

  await page.getByRole('button', { name: 'Menu' }).tap();
  const menu = page.getByRole('menu', { name: 'Menu' });
  await expect(menu).toBeVisible();
  for (const item of ['Rename project…', 'Export all projects (.gtkbackup)', 'Duplicate']) await expect(menu.getByRole('menuitem', { name: item })).toBeAttached();
  await sleep(300); // let the pop-in animation finish before measuring
  const box = await menu.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(402);
});

test('landscape phone keeps the compact layout', async ({ page }) => {
  await page.setViewportSize({ width: 874, height: 402 });
  await newPhoneGarden(page);
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Layers' })).toBeVisible();
  await noHorizontalOverflow(page);
  expect((await canvas(page)).height).toBeGreaterThan(150);
});

for (const [name, width, height] of [['iPhone 17 Pro Max', 440, 956], ['iPad mini portrait', 744, 1133], ['iPad Air portrait', 820, 1180]] as const) {
  test(`${name} (${width}×${height}) uses the full-width canvas without overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await newPhoneGarden(page);
    await noHorizontalOverflow(page);
    expect((await canvas(page)).width).toBeGreaterThan(width - 10);
    await page.getByRole('tab', { name: 'Plant database' }).tap();
    await noHorizontalOverflow(page);
  });
}

test('plant list rows never overlap after searching from a scrolled list', async ({ page }) => {
  await newPhoneGarden(page);
  await page.getByRole('tab', { name: 'Plant database' }).tap();
  const list = page.getByRole('listbox', { name: 'Plants' });
  await list.evaluate((el) => (el.scrollTop = 2000));
  await sleep(300);
  const search = page.getByLabel('Search plants');
  for (const ch of 'mari') {
    await search.press(ch);
    await sleep(80);
  }
  await sleep(400);
  const rows = await page.locator('.plant-item').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => [r.top, r.bottom]));
  expect(rows.length).toBeGreaterThan(1);
  for (let i = 1; i < rows.length; i++) expect(rows[i][0]).toBeGreaterThanOrEqual(rows[i - 1][1] - 1);
});

test('zoom controls sit below the ruler', async ({ page }) => {
  await newPhoneGarden(page);
  const c = await canvas(page);
  const z = await page.getByRole('group', { name: 'Zoom' }).boundingBox();
  expect(z!.y).toBeGreaterThanOrEqual(c.y + 20);
});
