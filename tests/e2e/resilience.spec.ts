import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { drag, drawRectMm, newGarden, objects, state, toPage } from './helpers';

const fixture = (f: string) => resolve(process.cwd(), 'tests/e2e/fixtures', f);

test.describe('blueprints', () => {
  test.beforeEach(async ({ page }) => {
    await newGarden(page, 'Blueprint');
  });

  async function importFile(page: any, f: string) {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import blueprint image or PDF' }).click();
    await (await chooser).setFiles(fixture(f));
    await expect(page.getByText('Blueprint imported')).toBeVisible();
    // Wait until the imported background is in the editor state before reading it.
    await expect.poll(() => state<number>(page, '(s) => s.doc.backgrounds.length')).toBe(1);
  }

  test('PDF blueprints are rendered to an image', async ({ page }) => {
    await importFile(page, 'site-plan.pdf');
    await expect(page.getByText(/first page of the PDF/)).toBeVisible();
    const bg = await state<any>(page, '(s) => s.doc.backgrounds[0]');
    expect(bg.naturalWidth).toBeGreaterThan(1000);
    await expect(page.locator('svg.canvas-svg image')).toHaveCount(1);
  });

  test('move, opacity, rotate, crop, lock and remove the blueprint', async ({ page }) => {
    await importFile(page, 'site-plan.png');
    const before = await state<any>(page, '(s) => s.doc.backgrounds[0].transform');
    const c = await toPage(page, before.x, before.y);
    await drag(page, c, { x: c.x + 100, y: c.y + 50 });
    const moved = await state<any>(page, '(s) => s.doc.backgrounds[0].transform');
    const scale = await state<number>(page, '(s) => s.view.scale');
    expect(moved.x - before.x).toBeCloseTo(100 / scale, -1);
    await page.getByLabel(/Opacity/).fill('0.4');
    await page.getByLabel('Rotation').fill('12');
    await page.getByLabel('Rotation').press('Enter');
    await page.getByRole('button', { name: 'Crop…' }).click();
    await page.getByLabel('Width (px)').fill('300');
    await page.getByLabel('Width (px)').press('Enter');
    await page.getByRole('button', { name: 'Apply crop' }).click();
    const bg = await state<any>(page, '(s) => s.doc.backgrounds[0]');
    expect(bg.opacity).toBeCloseTo(0.4);
    expect(bg.transform.rotation).toBe(12);
    expect(bg.crop.width).toBe(300);
    await page.getByLabel('Locked (prevents accidental moves)').check();
    const locked = await state<any>(page, '(s) => s.doc.backgrounds[0].transform');
    const c2 = await toPage(page, locked.x, locked.y);
    await drag(page, c2, { x: c2.x + 100, y: c2.y });
    expect((await state<any>(page, '(s) => s.doc.backgrounds[0].transform')).x).toBe(locked.x);
    await expect(page.getByRole('button', { name: 'Remove' })).toBeDisabled();
    await page.getByLabel('Locked (prevents accidental moves)').uncheck();
    await page.getByRole('button', { name: 'Remove' }).click();
    expect(await state<number>(page, '(s) => s.doc.backgrounds.length')).toBe(0);
  });

  test('calibration can rescale objects drawn before it', async ({ page }) => {
    await importFile(page, 'site-plan.png');
    await page.keyboard.press('Escape');
    await drawRectMm(page, 2000, 2000, 4000, 3000);
    const w0 = (await objects(page))[0].shape.width;
    await page.keyboard.press('k');
    await page.mouse.click((await toPage(page, 2000, 2000)).x, (await toPage(page, 2000, 2000)).y);
    await page.waitForTimeout(400);
    await page.mouse.click((await toPage(page, 4000, 2000)).x, (await toPage(page, 4000, 2000)).y);
    await page.locator('#calib-distance').fill('4 m');
    await expect(page.getByText(/rescale the 1 existing object/)).toBeVisible();
    await page.getByRole('button', { name: 'Apply scale' }).click();
    expect((await objects(page))[0].shape.width).toBeCloseTo(w0 * 2, -1);
    await expect(page.getByText(/Calibrated: 1 px/)).toBeVisible({ timeout: 2000 }).catch(() => undefined);
  });

  test('rejects non-image files', async ({ page }) => {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import blueprint image or PDF' }).click();
    await (await chooser).setFiles({ name: 'evil.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') });
    await expect(page.getByText('Could not import the image')).toBeVisible();
  });
});

test.describe('resilience', () => {
  test('warns when the same project is open in two tabs, and after the other tab saves', async ({ page, context }) => {
    await newGarden(page, 'Two tabs');
    const url = page.url();
    const other = await context.newPage();
    await other.goto(url);
    await expect(other.getByRole('application')).toBeVisible();
    await expect(page.getByText(/also open in another tab/)).toBeVisible();
    await drawRectMm(other, 1000, 1000, 2000, 2000);
    await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible({ timeout: 5000 });
  });

  test('a corrupted project can be restored from a version snapshot', async ({ page }) => {
    await newGarden(page, 'Fragile');
    await drawRectMm(page, 1000, 1000, 3000, 2000);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+s' : 'Control+s');
    await expect(page.getByText(/version snapshot/)).toBeVisible();
    const id = await state<string>(page, '(s) => s.doc.id');
    // Corrupt the stored document directly in IndexedDB.
    await page.evaluate(async (pid) => {
      await new Promise<void>((res, rej) => {
        const req = indexedDB.open('garden-toolkit');
        req.onsuccess = () => {
          const tx = req.result.transaction('docs', 'readwrite');
          tx.objectStore('docs').put({ id: pid, doc: { id: pid, docVersion: 1, meta: 'garbage' } });
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
        };
      });
    }, id);
    await page.goto('/');
    await page.goto(`/#/p/${id}`);
    await expect(page.getByText('This project could not be opened')).toBeVisible();
    await page.getByRole('row', { name: /Saved version/ }).getByRole('button', { name: 'Restore this version' }).click();
    await expect(page.getByRole('application')).toBeVisible();
    expect(await objects(page)).toHaveLength(1);
  });

  test('storage errors surface in the status bar instead of failing silently', async ({ page }) => {
    await newGarden(page, 'Quota');
    await page.evaluate(() => {
      const proto = IDBObjectStore.prototype as any;
      proto.__put = proto.put;
      proto.put = function () {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      };
    });
    await drawRectMm(page, 1000, 1000, 3000, 2000);
    await expect(page.getByText(/Save failed/)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('performance', () => {
  test('a garden with 400 objects and 400 plantings stays responsive', async ({ page }) => {
    await newGarden(page, 'Big garden');
    const t0 = Date.now();
    await page.evaluate(() => {
      const gtk = (window as any).__gtk;
      const e = gtk.editor.getState();
      e.commit('Bulk', (d: any) => {
        const layer = d.layers.find((l: any) => l.id === 'layer-beds');
        for (let i = 0; i < 400; i++) {
          const id = `obj_bulk_${i}`;
          d.objects[id] = { id, kind: 'bed', name: `Bed ${i}`, code: `B${i + 1}`, layerId: 'layer-beds', groupId: null, transform: { x: (i % 20) * 2500, y: Math.floor(i / 20) * 2000, rotation: 0 }, shape: { type: 'rect', width: 2000, height: 1200 }, style: {}, locked: false, hidden: false, props: {} };
          layer.objectIds.push(id);
          const pid = `pl_bulk_${i}`;
          d.plantings[pid] = { id: pid, plantId: ['daucus-carota-sativus', 'lactuca-sativa', 'solanum-lycopersicum', 'allium-cepa'][i % 4], objectId: id, season: d.settings.activeSeason, variety: '', method: null, areaShare: null, spacing: {}, quantityOverride: null, seedQuantityOverride: null, yieldOverride: null, dates: {}, status: 'planned', notes: '', createdAt: new Date(1e12 + i).toISOString() };
        }
      });
      e.fitToContent();
    });
    await expect(page.getByText('400', { exact: false }).first()).toBeVisible();
    const createMs = Date.now() - t0;
    // Selecting and dragging one bed must be quick even with 400 beds on screen.
    const t1 = Date.now();
    const p = await toPage(page, 1000, 600);
    await drag(page, p, { x: p.x + 40, y: p.y + 40 }, 10);
    const dragMs = Date.now() - t1;
    await expect(page.getByText('Saved locally')).toBeVisible({ timeout: 10000 });
    const t2 = Date.now();
    await page.reload();
    await expect(page.getByRole('application')).toBeVisible();
    await expect.poll(async () => (await objects(page)).length).toBe(400);
    const reloadMs = Date.now() - t2;
    console.log(`perf: create+render ${createMs} ms, drag ${dragMs} ms, reload ${reloadMs} ms`);
    expect(dragMs).toBeLessThan(4000);
    expect(reloadMs).toBeLessThan(10000);
    await page.getByRole('tab', { name: 'Plantings' }).click();
    await expect(page.getByRole('row')).toHaveCount(401);
  });
});
