import { expect, test } from '@playwright/test';
import { drag, drawRectMm, newGarden, objects, selection, setSnapping, toPage, focusCanvas } from './helpers';

test.describe('drawing tools', () => {
  test.beforeEach(async ({ page }) => {
    await newGarden(page);
  });

  test('rectangle snaps to the grid and records real dimensions', async ({ page }) => {
    await drawRectMm(page, 1030, 1020, 3980, 2210); // 50 cm grid → 1000..4000 × 1000..2000/2500
    const [o] = await objects(page);
    expect(o.kind).toBe('bed');
    expect(o.shape).toMatchObject({ type: 'rect', width: 3000 });
    expect([1000, 1500]).toContain(o.shape.height);
    await expect(page.getByText(/3\.00 m ×/).first()).toBeVisible();
  });

  test('Shift draws a square; a plain click creates a default-size bed', async ({ page }) => {
    await setSnapping(page, false);
    await page.keyboard.press('r');
    const a = await toPage(page, 1000, 1000);
    const b = await toPage(page, 3000, 2000);
    await page.keyboard.down('Shift');
    await drag(page, a, b);
    await page.keyboard.up('Shift');
    const click = await toPage(page, 6000, 6000);
    await page.mouse.click(click.x, click.y);
    const objs = await objects(page);
    expect(objs[0].shape.width).toBeCloseTo(objs[0].shape.height, 0);
    expect(objs[1].shape).toMatchObject({ width: 3000, height: 1200 });
  });

  test('ellipse, and changing the object type via "Draw as"', async ({ page }) => {
    await page.getByLabel('Object type to draw').selectOption('water');
    await drag(page, await toPage(page, 1000, 1000), await toPage(page, 3000, 2000));
    const [o] = await objects(page);
    expect(o.kind).toBe('water');
    expect(o.shape.type).toBe('ellipse');
  });

  test('polygon: click points, Backspace removes last, Enter finishes', async ({ page }) => {
    await page.getByLabel('Object type to draw').selectOption('lawn');
    await focusCanvas(page); // the select keeps focus and would swallow the key
    await page.keyboard.press('p');
    for (const [x, y] of [[1000, 1000], [6000, 1000], [6000, 6000], [3000, 4000]]) {
      const p = await toPage(page, x, y);
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(400); // avoid double-click detection
    }
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Enter');
    const [o] = await objects(page);
    expect(o.kind).toBe('lawn');
    expect(o.shape.type).toBe('polygon');
    expect(o.shape.points).toHaveLength(3);
  });

  test('polygon: Escape cancels', async ({ page }) => {
    await page.keyboard.press('p');
    for (const [x, y] of [[1000, 1000], [5000, 1000]]) {
      const p = await toPage(page, x, y);
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(400);
    }
    await page.keyboard.press('Escape');
    expect(await objects(page)).toHaveLength(0);
  });

  test('path with the line tool has a width and an area', async ({ page }) => {
    await page.getByLabel('Object type to draw').selectOption('path');
    for (const [x, y] of [[1000, 3000], [6000, 3000], [6000, 6000]]) {
      const p = await toPage(page, x, y);
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(400);
    }
    await page.keyboard.press('Enter');
    const [o] = await objects(page);
    expect(o.kind).toBe('path');
    expect(o.shape.width).toBe(1000);
    await expect(page.getByText('8.00 m²').first()).toBeVisible();
  });

  test('freehand creates a simplified area', async ({ page }) => {
    await page.getByLabel('Object type to draw').selectOption('flower-bed');
    await focusCanvas(page);
    await page.keyboard.press('f');
    const pts = Array.from({ length: 30 }, (_, i) => [2000 + Math.cos((i / 30) * Math.PI * 2) * 1500, 3000 + Math.sin((i / 30) * Math.PI * 2) * 1500]);
    const first = await toPage(page, pts[0][0], pts[0][1]);
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const [x, y] of pts.slice(1)) {
      const p = await toPage(page, x, y);
      await page.mouse.move(p.x, p.y);
    }
    await page.mouse.up();
    const [o] = await objects(page);
    expect(o.kind).toBe('flower-bed');
    expect(o.shape.points.length).toBeGreaterThan(5);
  });

  test('tree and shrub symbols (click and drag radius)', async ({ page }) => {
    await page.getByRole('button', { name: 'Tree', exact: true }).click();
    const p = await toPage(page, 5000, 5000);
    await page.mouse.click(p.x, p.y);
    await page.getByRole('button', { name: 'Shrub / bush' }).click();
    await drag(page, await toPage(page, 1000, 1000), await toPage(page, 2000, 1000));
    const objs = await objects(page);
    expect(objs.map((o) => o.kind).sort()).toEqual(['shrub', 'tree']);
    const shrub = objs.find((o) => o.kind === 'shrub');
    expect(shrub.shape.rx).toBeCloseTo(1000, -1);
    await expect(page.getByRole('button', { name: /Choose species/ })).toBeVisible();
  });

  test('text label: click places text and focuses the text field', async ({ page }) => {
    await page.keyboard.press('t');
    const p = await toPage(page, 3000, 3000);
    await page.mouse.click(p.x, p.y);
    const input = page.locator('#obj-text');
    await expect(input).toBeFocused();
    await input.fill('Herb spiral');
    await expect(page.locator('svg.canvas-svg text', { hasText: 'Herb spiral' })).toBeVisible();
  });

  test('dimension line shows real length; measure tool creates nothing', async ({ page }) => {
    await page.keyboard.press('d');
    let p = await toPage(page, 1000, 1000);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(400);
    p = await toPage(page, 5000, 1000);
    await page.mouse.click(p.x, p.y);
    const [dim] = await objects(page);
    expect(dim.kind).toBe('dimension');
    await expect(page.locator('svg.canvas-svg text', { hasText: '4.00 m' })).toBeVisible();
    await page.keyboard.press('m');
    await drag(page, await toPage(page, 1000, 3000), await toPage(page, 4000, 7000));
    await expect(page.locator('svg.canvas-svg text', { hasText: '5.00 m' })).toBeVisible();
    expect(await objects(page)).toHaveLength(1);
  });

  test('tool shortcuts switch tools and the toolbar reflects it', async ({ page }) => {
    await focusCanvas(page);
    for (const [key, label] of [['r', 'Rectangle'], ['o', 'Ellipse / circle'], ['p', 'Polygon'], ['l', 'Line / path'], ['h', 'Pan'], ['v', 'Select']] as const) {
      await page.keyboard.press(key);
      await expect(page.getByRole('button', { name: new RegExp(`^${label.replace('/', '\\/')}`) })).toHaveAttribute('aria-pressed', 'true');
    }
    expect(await selection(page)).toEqual([]);
  });
});
