import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { drawRectMm, newGarden, objects } from './helpers';

async function makeGarden(page: Page, name: string, beds: number) {
  await newGarden(page, name);
  for (let i = 0; i < beds; i++) await drawRectMm(page, 1000, 1000 + i * 1500, 3000, 2000 + i * 1500);
  await expect(page.getByText('Saved locally')).toBeVisible();
  await page.getByRole('button', { name: 'Back to all projects' }).click();
  await expect(page.getByRole('heading', { name: 'Your gardens' })).toBeVisible();
}

async function download(page: Page, action: () => Promise<void>) {
  const [d] = await Promise.all([page.waitForEvent('download'), action()]);
  return { name: d.suggestedFilename(), buffer: readFileSync((await d.path())!) };
}

async function clearAllProjects(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((res) => {
      const req = indexedDB.deleteDatabase('garden-toolkit');
      req.onsuccess = req.onerror = req.onblocked = () => res();
    });
  });
  await page.reload();
}

test.describe('project export & import', () => {
  test('export a project from its card on the home screen and import it back', async ({ page }) => {
    await makeGarden(page, 'Card export', 2);
    await page.getByRole('button', { name: 'Actions for Card export' }).click();
    const pkg = await download(page, () => page.getByRole('menuitem', { name: 'Export backup (.gtkproject)' }).click());
    expect(pkg.name).toBe('Card-export.gtkproject');
    await page.getByRole('button', { name: 'Actions for Card export' }).click();
    const json = await download(page, () => page.getByRole('menuitem', { name: 'Export as JSON' }).click());
    expect(JSON.parse(json.buffer.toString())).toMatchObject({ format: 'garden-toolkit-project', project: { name: 'Card export' } });

    await clearAllProjects(page);
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import project' }).click();
    await (await chooser).setFiles({ name: pkg.name, mimeType: 'application/zip', buffer: pkg.buffer });
    await expect(page.getByText('Imported 1 project')).toBeVisible();
    await expect(page.getByRole('application')).toBeVisible(); // single import opens the project
    expect(await objects(page)).toHaveLength(2);
  });

  test('"Export all" creates one backup that restores every project', async ({ page }) => {
    await makeGarden(page, 'Garden one', 1);
    await newGarden(page, 'Garden two');
    await drawRectMm(page, 1000, 1000, 3000, 2000);
    await drawRectMm(page, 4000, 1000, 6000, 2000);
    await drawRectMm(page, 1000, 3000, 3000, 4000);
    await expect(page.getByText('Saved locally')).toBeVisible();
    await page.getByRole('button', { name: 'Back to all projects' }).click();
    const backup = await download(page, () => page.getByRole('button', { name: 'Export all' }).click());
    expect(backup.name).toMatch(/^garden-toolkit-backup-\d{4}-\d{2}-\d{2}\.gtkbackup$/);
    await expect(page.getByText('Exported 2 projects to one backup file')).toBeVisible();

    await clearAllProjects(page);
    await expect(page.getByText('Plan your first garden')).toBeVisible();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import project' }).click();
    await (await chooser).setFiles({ name: backup.name, mimeType: 'application/zip', buffer: backup.buffer });
    await expect(page.getByText('Imported 2 projects')).toBeVisible();
    // Several projects stay in the list rather than opening one.
    await expect(page.getByRole('button', { name: 'Open Garden one' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Garden two' })).toBeVisible();
    await page.getByRole('button', { name: 'Open Garden two' }).click();
    await expect(page.getByRole('application')).toBeVisible();
    expect(await objects(page)).toHaveLength(3);
  });

  test('several files can be imported at once; bad files are reported without blocking good ones', async ({ page }) => {
    await makeGarden(page, 'Multi A', 1);
    await page.getByRole('button', { name: 'Actions for Multi A' }).click();
    const a = await download(page, () => page.getByRole('menuitem', { name: 'Export backup (.gtkproject)' }).click());
    await clearAllProjects(page);
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import project' }).click();
    await (await chooser).setFiles([
      { name: 'a.gtkproject', mimeType: 'application/zip', buffer: a.buffer },
      { name: 'b.gtkproject', mimeType: 'application/zip', buffer: a.buffer },
      { name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') },
    ]);
    await expect(page.getByText('Imported 2 projects')).toBeVisible();
    await expect(page.getByText('1 file(s) could not be imported')).toBeVisible();
    await expect(page.getByText(/notes\.json: This file is not a Garden Toolkit project/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Multi A' })).toHaveCount(2);
  });

  test('project files can be dropped onto the home screen', async ({ page }) => {
    await makeGarden(page, 'Dropped', 1);
    await page.getByRole('button', { name: 'Actions for Dropped' }).click();
    const pkg = await download(page, () => page.getByRole('menuitem', { name: 'Export backup (.gtkproject)' }).click());
    await clearAllProjects(page);
    const data = await page.evaluateHandle((bytes: number[]) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(bytes)], 'dropped.gtkproject', { type: 'application/zip' }));
      return dt;
    }, [...pkg.buffer]);
    await page.dispatchEvent('.home', 'dragover', { dataTransfer: data });
    await expect(page.getByText('Drop project files to import')).toBeVisible();
    await page.dispatchEvent('.home', 'drop', { dataTransfer: data });
    await expect(page.getByText('Imported 1 project')).toBeVisible();
    await expect(page.getByRole('application')).toBeVisible();
    expect(await objects(page)).toHaveLength(1);
  });

  test('the editor toolbar Export button and File menu export and import', async ({ page }) => {
    await newGarden(page, 'Toolbar export');
    await drawRectMm(page, 1000, 1000, 3000, 2000);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const pkg = await download(page, () => page.getByRole('menuitem', { name: 'Project package (.gtkproject)' }).click());
    expect(pkg.name).toBe('Toolbar-export.gtkproject');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const json = await download(page, () => page.getByRole('menuitem', { name: 'Single JSON file' }).click());
    expect(json.name).toBe('Toolbar-export.gardentoolkit.json');
    // Import a JSON copy from inside the editor via the File menu.
    await page.getByRole('button', { name: 'File' }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('menuitem', { name: 'Import project files…' }).click();
    await (await chooser).setFiles({ name: json.name, mimeType: 'application/json', buffer: json.buffer });
    await expect(page.getByText('Imported 1 project')).toBeVisible();
    await expect(page.locator('.project-name')).toHaveText('Toolbar export');
    // Export all from the File menu too.
    await page.getByRole('button', { name: 'File' }).click();
    const all = await download(page, () => page.getByRole('menuitem', { name: 'Export all projects (.gtkbackup)' }).click());
    expect(all.buffer.subarray(0, 2).toString()).toBe('PK');
  });
});
