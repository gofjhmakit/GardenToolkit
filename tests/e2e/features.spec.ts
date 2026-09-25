import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { drawRectMm, focusCanvas, mod, newGarden, objects, state, toPage } from './helpers';

async function plantIn(page: any, x: number, y: number, query: string, name: RegExp) {
  const c = await toPage(page, x, y);
  await page.mouse.click(c.x, c.y);
  await page.getByRole('button', { name: /^Add plants/ }).first().click();
  await page.getByLabel('Search plants').fill(query);
  await page.getByRole('button', { name }).click();
}

test.describe('project management (home)', () => {
  test('rename, duplicate and delete from the project list', async ({ page }) => {
    await newGarden(page, 'Alpha');
    await drawRectMm(page, 1000, 1000, 3000, 2000);
    await expect(page.getByText('Saved locally')).toBeVisible();
    await page.getByRole('button', { name: 'Back to all projects' }).click();
    await page.getByRole('button', { name: 'Actions for Alpha' }).click();
    await page.getByRole('menuitem', { name: 'Rename…' }).click();
    await page.getByLabel('Name', { exact: true }).fill('Beta');
    await page.getByRole('button', { name: 'Rename' }).click();
    await expect(page.getByRole('button', { name: 'Open Beta' })).toBeVisible();
    await page.getByRole('button', { name: 'Actions for Beta' }).click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    await expect(page.getByRole('button', { name: 'Open Beta (copy)' })).toBeVisible();
    await expect(page.getByText('1 objects').first()).toBeVisible();
    await page.getByRole('button', { name: 'Actions for Beta (copy)' }).click();
    await page.getByRole('menuitem', { name: 'Delete…' }).click();
    await page.getByRole('button', { name: 'Delete permanently' }).click();
    await expect(page.getByRole('button', { name: 'Open Beta (copy)' })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Open Beta' })).toBeVisible();
  });

  test('opening a missing project shows a recoverable error', async ({ page }) => {
    await page.goto('/#/p/prj_does-not-exist');
    await expect(page.getByText('This project could not be opened')).toBeVisible();
    await page.getByRole('button', { name: 'Back to projects' }).click();
    await expect(page.getByRole('heading', { name: 'Your gardens' })).toBeVisible();
  });

  test('Save as creates an independent copy', async ({ page }) => {
    await newGarden(page, 'Original');
    await drawRectMm(page, 1000, 1000, 3000, 2000);
    await page.getByRole('button', { name: 'File' }).click();
    await page.getByRole('menuitem', { name: 'Save as…' }).click();
    await page.getByLabel('New project name').fill('Variant');
    await page.getByRole('button', { name: 'Save copy' }).click();
    await expect(page.locator('.project-name')).toHaveText('Variant');
    expect(await objects(page)).toHaveLength(1);
  });
});

test.describe('planting workflow & views', () => {
  test.beforeEach(async ({ page }) => {
    await newGarden(page, 'Views garden');
    await drawRectMm(page, 1000, 1000, 4000, 2000);
    await drawRectMm(page, 1000, 3000, 4000, 4000);
    await page.keyboard.press('Escape');
  });

  test('sun warnings appear for shady beds', async ({ page }) => {
    const c = await toPage(page, 2500, 1500);
    await page.mouse.click(c.x, c.y);
    await page.getByLabel('Sun exposure').selectOption('shade');
    await plantIn(page, 2500, 1500, 'tomato', /^Add Tomato to 1 area/);
    await expect(page.getByText(/Prefers full sun/).first()).toBeVisible();
  });

  test('two plants share a bed; area share and quantities follow', async ({ page }) => {
    await plantIn(page, 2500, 1500, 'carrot', /^Add Carrot to 1 area/);
    await plantIn(page, 2500, 1500, 'onion', /^Add Onion to 1 area/);
    await expect(page.getByText(/Share of area/).first()).toBeVisible();
    const share = page.getByLabel('Share of area').first();
    await share.fill('75');
    await share.press('Enter');
    const shares = await state<number[]>(page, '(s) => Object.values(s.doc.plantings).map((p) => p.areaShare)');
    expect(shares).toContain(0.75);
    await expect(page.getByText(/Companion notes/)).toBeVisible();
  });

  test('plantings, calendar, harvest, care, rotation views reflect plantings', async ({ page }) => {
    await plantIn(page, 2500, 1500, 'potato', /^Add Potato to 1 area/);
    await plantIn(page, 2500, 3500, 'pea', /^Add Pea to 1 area/);
    await page.getByRole('tab', { name: 'Plantings' }).click();
    await expect(page.getByRole('cell', { name: /Potato/ })).toBeVisible();
    await page.getByRole('tab', { name: 'Calendar' }).click();
    await expect(page.getByText(/Plant: Potato/).first()).toBeVisible();
    await expect(page.getByText(/Harvest: Potato/).first()).toBeVisible();
    await page.getByRole('tab', { name: 'Harvest' }).click();
    await expect(page.getByText(/Estimated total harvest/)).toBeVisible();
    await page.getByRole('tab', { name: 'Care guide' }).click();
    await expect(page.getByRole('heading', { name: /Potato/ })).toBeVisible();
    await page.getByRole('tab', { name: 'Crop rotation' }).click();
    await expect(page.getByText(/Potatoes & tomatoes/).first()).toBeVisible();
  });

  test('calendar date edits survive regeneration and reload', async ({ page }) => {
    await plantIn(page, 2500, 1500, 'tomato', /^Add Tomato to 1 area/);
    await page.getByRole('tab', { name: 'Calendar' }).click();
    const date = page.getByLabel(/Change date of "Sow indoors: Tomato/);
    await date.fill('2026-03-01');
    await expect(page.getByText('your date')).toBeVisible();
    await page.getByRole('tab', { name: 'Design' }).click();
    await plantIn(page, 2500, 3500, 'basil', /^Add Basil to 1 area/);
    await expect(page.getByText('Saved locally')).toBeVisible();
    await page.reload();
    await page.getByRole('tab', { name: 'Calendar' }).click();
    await expect(page.getByLabel(/Change date of "Sow indoors: Tomato/)).toHaveValue('2026-03-01');
  });

  test('plant database: filters, favourites persist, detail shows provenance', async ({ page }) => {
    await page.getByRole('tab', { name: 'Plant database' }).click();
    await page.getByRole('button', { name: 'Herb', exact: true }).click();
    await expect(page.getByText(/of 110 plants/)).toContainText(/^2\d of 110/);
    await page.getByLabel('Search plants').fill('basil');
    await page.getByRole('button', { name: 'Add to favourites' }).click();
    await expect(page.getByRole('heading', { name: 'Data source' })).toBeVisible();
    await expect(page.getByText('Garden Toolkit editorial seed data')).toBeVisible();
    await page.reload();
    await page.getByRole('tab', { name: 'Plant database' }).click();
    await page.getByLabel(/Favourites only/).check();
    await expect(page.getByRole('listbox', { name: 'Plants' }).getByRole('option')).toHaveCount(1);
  });

  test('custom plants can be created and used', async ({ page }) => {
    await page.getByRole('tab', { name: 'Plant database' }).click();
    await page.getByRole('button', { name: 'New custom plant' }).click();
    await page.getByLabel('Common name *').fill('Grandma bean');
    await page.getByLabel('Plant spacing min–max (cm)').fill('10');
    await page.getByLabel('Plant spacing min–max (cm)').press('Tab');
    await page.getByRole('button', { name: 'Save plant' }).click();
    await page.getByRole('tab', { name: 'Design' }).click();
    await plantIn(page, 2500, 1500, 'grandma', /^Add Grandma bean to 1 area/);
    const qty = await state<number[]>(page, "(s) => Object.values(s.doc.plantings).map((p) => p.plantId.startsWith('user-'))");
    expect(qty).toEqual([true]);
  });

  test('settings: preset, units and theme', async ({ page }) => {
    await page.getByRole('tab', { name: 'Garden settings' }).click();
    await page.getByLabel('Quick preset').selectOption('fi-VI');
    await expect(page.getByText(/Frost-free period/)).toContainText('87 days');
    await page.getByLabel('Units').selectOption('imperial');
    await page.getByLabel('Theme').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('tab', { name: 'Design' }).click();
    await expect(page.getByText('Imperial')).toBeVisible();
  });

  test('versions: a saved version can be restored and the restore undone', async ({ page }) => {
    await focusCanvas(page);
    await page.keyboard.press(`${mod}+s`);
    await expect(page.getByText(/version snapshot/)).toBeVisible();
    await drawRectMm(page, 5000, 5000, 6000, 6000);
    expect(await objects(page)).toHaveLength(3);
    await page.getByRole('tab', { name: 'Garden settings' }).click();
    await page.getByRole('row', { name: /Saved version/ }).getByRole('button', { name: 'Restore' }).click();
    await page.getByRole('button', { name: 'Restore', exact: true }).last().click();
    expect(await objects(page)).toHaveLength(2);
    await page.keyboard.press(`${mod}+z`);
    expect(await objects(page)).toHaveLength(3);
  });

  test('undo history labels appear in the Edit menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('menuitem', { name: /Undo Add garden bed/ })).toBeVisible();
  });
});

test.describe('exports', () => {
  test('SVG, PNG, CSV, iCal, JSON exports and all PDFs', async ({ page }) => {
    await newGarden(page, 'Export garden');
    await drawRectMm(page, 1000, 1000, 4000, 2000);
    await plantIn(page, 2500, 1500, 'carrot', /^Add Carrot to 1 area/);
    await page.getByRole('tab', { name: 'Reports & export' }).click();
    const grab = async (button: RegExp, root = page) => {
      const [d] = await Promise.all([page.waitForEvent('download'), root.getByRole('button', { name: button }).click()]);
      return { name: d.suggestedFilename(), buf: readFileSync((await d.path())!) };
    };
    const svg = await grab(/Scaled plan \(SVG/);
    expect(svg.buf.toString()).toContain('<svg');
    expect(svg.buf.toString()).not.toContain('<script');
    const png = await grab(/Plan image \(PNG/);
    expect(png.buf.subarray(1, 4).toString()).toBe('PNG');
    const csv = await grab(/^Plantings$/);
    expect(csv.buf.toString()).toContain('Daucus carota');
    expect((await grab(/Areas & objects/)).buf.toString()).toContain('Garden bed 1');
    expect((await grab(/^Calendar$/)).buf.toString()).toContain('Sow outdoors');
    expect((await grab(/Calendar \(iCal\)/)).buf.toString()).toContain('BEGIN:VEVENT');
    const json = await grab(/Single JSON file/);
    expect(JSON.parse(json.buf.toString())).toMatchObject({ format: 'garden-toolkit-project', schemaVersion: 1 });
    for (const title of ['Planting plan', 'Garden design', 'Care guide', 'Planting calendar', 'Harvest plan', 'Complete garden information']) {
      const card = page.locator('.card').filter({ has: page.getByText(title, { exact: true }) });
      const pdf = await grab(/Download PDF/, card as any);
      expect(pdf.buf.subarray(0, 5).toString()).toBe('%PDF-');
    }
  });

  test('report preview renders the plan', async ({ page }) => {
    await newGarden(page, 'Preview garden');
    await drawRectMm(page, 1000, 1000, 4000, 2000);
    await page.getByRole('tab', { name: 'Reports & export' }).click();
    await page.locator('.card').filter({ has: page.getByText('Planting plan', { exact: true }) }).getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByRole('img', { name: 'Scaled garden plan' })).toBeVisible();
  });
});

test.describe('offline', () => {
  test('works offline after the first load (service worker)', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your gardens' })).toBeVisible();
    await page.getByRole('button', { name: 'New garden' }).first().click();
    await page.getByRole('button', { name: 'Create garden' }).click();
    await expect(page.getByRole('application')).toBeVisible();
    await page.getByRole('tab', { name: 'Plant database' }).click();
    await page.getByLabel('Search plants').fill('porkkana');
    await expect(page.getByRole('listbox', { name: 'Plants' }).getByRole('option', { name: /Carrot/ })).toBeVisible();
    await context.setOffline(false);
  });
});

test.describe('accessibility', () => {
  const run = async (page: any) => {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).disableRules(['color-contrast']).analyze();
    return results.violations.map((v: any) => `${v.id}: ${v.nodes.length} × ${v.help} :: ${v.nodes.map((n: any) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
  };
  test('home screen has no WCAG A/AA violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Your gardens' })).toBeVisible();
    expect(await run(page)).toEqual([]);
  });
  test('editor and dialogs have no WCAG A/AA violations', async ({ page }) => {
    await newGarden(page, 'A11y');
    await drawRectMm(page, 1000, 1000, 4000, 2000);
    const c = await toPage(page, 2500, 1500);
    await page.mouse.click(c.x, c.y);
    expect(await run(page)).toEqual([]);
    await page.getByRole('button', { name: /^Add plants/ }).first().click();
    expect(await run(page)).toEqual([]);
    await page.keyboard.press('Escape');
    for (const tab of ['Calendar', 'Plant database', 'Reports & export', 'Garden settings']) {
      await page.getByRole('tab', { name: tab }).click();
      expect(await run(page), tab).toEqual([]);
    }
  });
  test('core flows are keyboard operable', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Your gardens' })).toBeVisible();
    // Tab through the header until "New garden" has focus.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement?.textContent?.includes('New garden'))) break;
    }
    expect(await page.evaluate(() => document.activeElement?.textContent)).toContain('New garden');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('application')).toBeVisible();
    await page.getByRole('tab', { name: 'Plant database' }).focus();
    await page.keyboard.press('Enter');
    await page.getByLabel('Search plants').focus();
    await page.keyboard.type('pea');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('listbox', { name: 'Plants' }).getByRole('option', { selected: true })).toBeVisible();
    await page.getByRole('listbox', { name: 'Plants' }).focus();
    await page.keyboard.press('f');
    await expect(page.getByRole('listbox', { name: 'Plants' }).getByRole('option', { name: /favourite/ })).toHaveCount(1);
  });
});
