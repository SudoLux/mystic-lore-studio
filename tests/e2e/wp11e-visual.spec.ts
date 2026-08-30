import { expect, test } from '@playwright/test';
import { createGarment, createStudioThroughUi, uniqueStudioIdentity } from './support';

test('WP11E specialist workspaces share a calm garment-first workbench', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11e-visual'));
  await createGarment(page, 'Rōnyn Field Jacket');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;

  await page.goto(`/#/technical/${garmentId}`);
  await expect(page.getByTestId('specialist-garment-context')).toBeVisible();
  await page.getByRole('button', { name: /Create specification/ }).click();
  await expect(page.getByRole('heading', { exact: true, name: 'Flats' })).toBeVisible();
  await expect(page.locator('#main-content')).toHaveScreenshot('wp11e-technical-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });

  await page.goto(`/#/production/${garmentId}`);
  await expect(page.getByTestId('specialist-garment-context')).toBeVisible();
  await expect(page.locator('#main-content')).toHaveScreenshot('wp11e-production-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });

  await page.goto('/#/lookbooks');
  await page.getByRole('button', { name: /New Collection/i }).last().click();
  await expect(page.getByTestId('specialist-garment-context')).toBeVisible();
  await expect(page.locator('#main-content')).toHaveScreenshot('wp11e-editorial-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });

  await page.goto('/#/portfolio');
  const setupPortfolio = page.getByRole('button', { name: 'Set up portfolio' });
  await expect(setupPortfolio).toBeVisible();
  await setupPortfolio.click();
  await expect(page.getByRole('heading', { name: 'Curate the public cut.' })).toBeVisible();
  await expect(page.getByTestId('specialist-garment-context')).toBeVisible();
  await expect(page.locator('#main-content')).toHaveScreenshot('wp11e-portfolio-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });

  await page.goto('/#/versions');
  await expect(page.getByTestId('specialist-garment-context')).toBeVisible();
  await page.setViewportSize({ height: 844, width: 390 });
  await page.waitForTimeout(250);
  await expect(page).toHaveScreenshot('wp11e-versions-mobile.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });
});
