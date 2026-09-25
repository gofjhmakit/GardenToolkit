import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mod = process.platform === 'darwin' ? 'Meta' : 'Control';

async function newGarden(page: Page, name = 'Test garden') {
  await page.goto('/');
  await page.getByRole('button', { name: 'New garden' }).first().click();
  await page.locator('#new-name').fill(name);
  await page.getByLabel('Location (optional)').selectOption('fi-II');
  await page.getByRole('button', { name: 'Create garden' }).click();
  await expect(page.getByRole('application')).toBeVisible();
}

async function canvasBox(page: Page) {
  const box = await page.locator('svg.canvas-svg').boundingBox();
  if (!box) throw new Error('no canvas');
  return box;
}

async function drawRect(page: Page, x1: number, y1: number, x2: number, y2: number) {
  const b = await canvasBox(page);
  await page.keyboard.press('r');
  await page.mouse.move(b.x + x1, b.y + y1);
  await page.mouse.down();
  await page.mouse.move(b.x + x2, b.y + y2, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.press('v');
}

const bedRows = (page: Page) => page.locator('[role=group] > [role=treeitem]').filter({ hasText: /Garden bed \d/ });

test('create, draw, multi-select, plant, undo/redo, copy/paste and reload', async ({ page }) => {
  await newGarden(page);
  await drawRect(page, 300, 250, 600, 370);
  await drawRect(page, 300, 450, 600, 570);
  await expect(bedRows(page)).toHaveCount(2);

  // Marquee multi-select both beds and assign carrots to both.
  const b = await canvasBox(page);
  await page.mouse.move(b.x + 250, b.y + 200);
  await page.mouse.down();
  await page.mouse.move(b.x + 650, b.y + 620, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByText('2 selected')).toBeVisible();
  await page.getByRole('button', { name: /Add plants \(2\)/ }).click();
  await page.getByLabel('Search plants').fill('carrot');
  await page.getByRole('button', { name: /^Add Carrot to 2 areas/ }).click();
  await expect(page.getByText(/Carrot ×\d+/).first()).toBeVisible();

  // Undo removes the plantings, redo brings them back.
  await page.locator('svg.canvas-svg').focus();
  await page.keyboard.press(`${mod}+z`);
  await expect(page.getByText(/Carrot ×\d+/)).toHaveCount(0);
  await page.keyboard.press(`${mod}+Shift+z`);
  await expect(page.getByText(/Carrot ×\d+/).first()).toBeVisible();

  // Select one bed, override quantity in the inspector.
  await page.mouse.click(b.x + 450, b.y + 300);
  await expect(page.getByText('1 selected')).toBeVisible();
  const qty = page.getByLabel('Your quantity');
  await qty.fill('300');
  await qty.press('Enter');
  await expect(page.getByText('your value')).toBeVisible();

  // Copy/paste creates a third bed with its planting.
  await page.locator('svg.canvas-svg').focus();
  await page.keyboard.press(`${mod}+c`);
  await page.keyboard.press(`${mod}+v`);
  await expect(bedRows(page)).toHaveCount(3);
  await page.keyboard.press(`${mod}+d`);
  await expect(bedRows(page)).toHaveCount(4);
  await page.keyboard.press('Delete');
  await expect(bedRows(page)).toHaveCount(3);

  // Autosave, then reload: everything is still there.
  await expect(page.getByText('Saved locally')).toBeVisible({ timeout: 5000 });
  await page.reload();
  await expect(bedRows(page)).toHaveCount(3);
  await expect(page.getByText(/Carrot ×300/)).toHaveCount(2); // original + pasted copy keep the override
  await expect(page.getByText('Saved locally')).toBeVisible();
});

test('export a project package and import it again', async ({ page }) => {
  await newGarden(page, 'Roundtrip garden');
  await drawRect(page, 300, 250, 600, 370);
  await expect(page.getByText('Saved locally')).toBeVisible({ timeout: 5000 });
  await page.getByRole('tab', { name: 'Reports & export' }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Project package/ }).click()]);
  const path = await download.path();
  expect(download.suggestedFilename()).toMatch(/\.gtkproject$/);
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import project' }).click();
  await (await chooser).setFiles({ name: 'backup.gtkproject', mimeType: 'application/zip', buffer: readFileSync(path!) });
  await expect(page.getByText(/Imported "Roundtrip garden"/)).toBeVisible();
  await expect(bedRows(page)).toHaveCount(1);
});

test('rejects a corrupted project file without crashing', async ({ page }) => {
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import project' }).click();
  await (await chooser).setFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"garden-toolkit-project","schemaVersion":1,"project":{}}') });
  await expect(page.getByText(/Import failed/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your gardens' })).toBeVisible();
});

test('import a blueprint and calibrate its scale', async ({ page }) => {
  await newGarden(page, 'Blueprint garden');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import blueprint…' }).click();
  await (await chooser).setFiles(resolve(process.cwd(), 'tests/e2e/fixtures/site-plan.png'));
  await expect(page.getByText('Blueprint imported')).toBeVisible();
  await expect(page.getByText('uncalibrated')).toBeVisible();
  await page.keyboard.press('k');
  const b = await canvasBox(page);
  await page.mouse.click(b.x + 400, b.y + 400);
  await page.mouse.click(b.x + 700, b.y + 400);
  await page.locator('#calib-distance').fill('10 m');
  await page.getByRole('button', { name: 'Apply scale' }).click();
  await expect(page.getByText(/Scale calibrated/)).toBeVisible();
  await expect(page.getByText('uncalibrated')).toHaveCount(0);
});

test('generates PDF documents', async ({ page }) => {
  await newGarden(page, 'PDF garden');
  await drawRect(page, 300, 250, 600, 370);
  await page.getByRole('button', { name: /^Add plants/ }).first().click();
  await page.getByLabel('Search plants').fill('tomato');
  await page.getByRole('button', { name: /^Add Tomato to 1 area/ }).click();
  await page.getByRole('tab', { name: 'Reports & export' }).click();
  for (const title of ['Planting plan', 'Care guide', 'Complete garden information']) {
    const card = page.locator('.card').filter({ hasText: title });
    const [download] = await Promise.all([page.waitForEvent('download'), card.getByRole('button', { name: /Download PDF/ }).click()]);
    const buf = readFileSync((await download.path())!);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(3000);
  }
});
