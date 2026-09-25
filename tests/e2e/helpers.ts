import { expect, type Page } from '@playwright/test';

export const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

export async function newGarden(page: Page, name = 'Test garden', preset = 'fi-II') {
  await page.goto('/');
  await page.getByRole('button', { name: 'New garden' }).first().click();
  await page.locator('#new-name').fill(name);
  if (preset) await page.getByLabel('Location (optional)').selectOption(preset);
  await page.getByRole('button', { name: 'Create garden' }).click();
  await expect(page.getByRole('application')).toBeVisible();
  // Predictable view: 100 % zoom with the origin at the top-left of the canvas.
  await page.evaluate(() => {
    const e = (window as any).__gtk.editor.getState();
    e.setView({ scale: 0.1, x: 0, y: 0 });
  });
}

export async function canvasBox(page: Page) {
  const box = await page.locator('svg.canvas-svg').boundingBox();
  if (!box) throw new Error('no canvas');
  return box;
}

/** Screen position (page coordinates) of a world point in mm. */
export async function toPage(page: Page, x: number, y: number) {
  const b = await canvasBox(page);
  const v = await page.evaluate(() => (window as any).__gtk.editor.getState().view);
  return { x: b.x + x * v.scale + v.x, y: b.y + y * v.scale + v.y };
}

export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 8) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
}

/** Draws a rectangle between two world points (mm). */
export async function drawRectMm(page: Page, x1: number, y1: number, x2: number, y2: number) {
  await page.keyboard.press('r');
  await drag(page, await toPage(page, x1, y1), await toPage(page, x2, y2));
  await page.keyboard.press('v');
}

export async function state<T = any>(page: Page, fn: string): Promise<T> {
  return page.evaluate((f) => {
    const s = (window as any).__gtk.editor.getState();
    // eslint-disable-next-line no-new-func
    return new Function('s', `return (${f})(s)`)(s);
  }, fn);
}

export const objects = (page: Page) => state<any[]>(page, '(s) => Object.values(s.doc.objects)');
export const selection = (page: Page) => state<string[]>(page, '(s) => s.selection');

export async function setSnapping(page: Page, on: boolean) {
  await page.evaluate((v) => {
    const e = (window as any).__gtk.editor.getState();
    e.setSnapping(v);
  }, on);
}

export async function focusCanvas(page: Page) {
  await page.locator('svg.canvas-svg').focus();
}
