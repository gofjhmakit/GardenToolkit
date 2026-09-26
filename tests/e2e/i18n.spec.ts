import { expect, test } from '@playwright/test';
import { drawRectMm, newGarden } from './helpers';

test('switching to Finnish translates the app, keeps the project and uses Finnish number formats', async ({ page }) => {
  await newGarden(page, 'Language test');
  await drawRectMm(page, 1000, 1000, 3500, 2500);
  await page.getByRole('tab', { name: 'Garden settings' }).click();
  await page.getByLabel('Interface language').selectOption('fi');
  // The app saves and reloads in Finnish.
  await expect(page.getByRole('tab', { name: 'Puutarhan asetukset' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Suunnittelu' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('fi');
  // The drawn bed survived the reload and its area uses a decimal comma.
  await page.getByRole('tab', { name: 'Suunnittelu' }).click();
  await expect(page.getByText('3,75 m²').first()).toBeVisible();
  await page.getByRole('button', { name: 'Takaisin kaikkiin projekteihin' }).click();
  await expect(page.getByRole('heading', { name: 'Puutarhasi', exact: true })).toBeVisible();
  await expect(page.getByText('1 kohde')).toBeVisible();

  // And back to English.
  await page.getByRole('button', { name: 'Avaa Language test' }).click();
  await page.getByRole('tab', { name: 'Puutarhan asetukset' }).click();
  await page.getByLabel('Käyttöliittymän kieli').selectOption('en');
  await expect(page.getByRole('tab', { name: 'Garden settings' })).toBeVisible();
});

test('a Finnish browser starts in Finnish with Finnish plant names and months', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'fi-FI' });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Puutarhasi', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Uusi puutarha' }).first().click();
  await page.locator('#new-name').fill('Kotipuutarha');
  await page.getByLabel('Sijainti (valinnainen)').selectOption('fi-III');
  await page.getByRole('button', { name: 'Luo puutarha' }).click();
  await page.getByRole('tab', { name: 'Kasvitietokanta' }).click();
  await page.getByLabel('Hae kasveja').fill('porkkana');
  await expect(page.getByRole('heading', { name: 'Porkkana' })).toBeVisible();
  await expect(page.getByText('Kylvö', { exact: true })).toBeVisible();
  await ctx.close();
});
