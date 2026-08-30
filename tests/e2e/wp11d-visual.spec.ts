import { expect, test } from '@playwright/test';
import { createGarment, createStudioThroughUi, uniqueStudioIdentity } from './support';

test('WP11D keeps garment inspiration and the textile archive visually dominant', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11d-visual'));
  await createGarment(page, 'Waden Sutra Jacket');

  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await page.getByLabel('Creative description').fill('A protective, fluid layer shaped by ritual tailoring, quiet movement, and weathered midnight color.');
  await page.getByLabel('Who is it for?').fill('The modern mythmaker');
  await page.getByLabel('Silhouette').fill('Long, articulated, softly armored');
  await page.getByLabel('Color story').fill('Midnight indigo, oxidized bronze, warm stone');
  await page.getByLabel('Signature details').fill('Articulated sleeve, wrapped closure, hand-finished edge');
  await page.getByRole('button', { name: 'Save creative direction' }).click();

  await page.getByRole('region', { name: 'Choose a material' }).getByRole('button', { name: 'Create inline' }).click();
  await page.getByPlaceholder('Material name').fill('Washed Indigo Linen');
  await page.getByRole('button', { name: 'Create and use' }).click();
  await expect(page.getByText('Washed Indigo Linen').first()).toBeVisible();

  await page.getByRole('button', { name: 'Story', exact: true }).click();
  await expect(page.getByTestId('garment-inspiration-hero')).toBeVisible();
  await expect(page.locator('main')).toHaveScreenshot('wp11d-garment-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });

  await page.goto('/#/fabrics');
  await expect(page.getByRole('heading', { exact: true, name: 'Material Vault' })).toBeVisible();
  for (const material of [
    { color: '#273754', colorName: 'Midnight indigo', composition: 'Washed linen', name: 'Washed Indigo Linen' },
    { color: '#8f6842', colorName: 'Weathered bronze', composition: 'Silk and cotton', name: 'Bronze Cloud Satin' },
    { color: '#c3b8a4', colorName: 'Warm stone', composition: 'Brushed wool', name: 'Atelier Brushed Wool' },
  ]) {
    if (await page.getByText(material.name, { exact: true }).count()) continue;
    await page.getByRole('button', { name: 'New material' }).click();
    await page.getByPlaceholder('Material name').fill(material.name);
    await page.getByPlaceholder('Wool, linen, silk…').fill(material.composition);
    await page.getByPlaceholder('Midnight indigo').fill(material.colorName);
    await page.locator('input[name="colorHex"]').fill(material.color);
    await page.getByRole('button', { name: 'Add to the Studio' }).click();
  }
  await expect(page.getByTestId('material-story')).toBeVisible();
  await expect(page.locator('main')).toHaveScreenshot('wp11d-material-vault-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });

  await page.setViewportSize({ height: 1366, width: 1024 });
  await page.waitForTimeout(250);
  await expect(page).toHaveScreenshot('wp11d-material-vault-ipad.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });

  await page.goto('/#/projects');
  await page.getByTestId('garment-card').filter({ hasText: 'Waden Sutra Jacket' }).getByRole('button', { name: 'Continue' }).click();
  await page.setViewportSize({ height: 844, width: 390 });
  await page.waitForTimeout(250);
  await expect(page).toHaveScreenshot('wp11d-garment-mobile.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });
});
