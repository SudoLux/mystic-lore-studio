import { expect, test } from '@playwright/test';
import { createGarment, createStudioThroughUi, uniqueStudioIdentity } from './support';

test('WP11C Dashboard and Garment Library retain their image-first hierarchy', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11-visual'));
  for (const title of ['Meridian Shirt', 'Sankofa Pants', 'Rōnyn Cardigan', 'Denim Blazer Dress', 'Waden Sutra Jacket']) {
    await createGarment(page, title);
  }

  await page.goto('/#/today');
  await expect(page.getByTestId('featured-garment')).toBeVisible();
  await expect(page.locator('main')).toHaveScreenshot('wp11c-dashboard-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });

  await page.goto('/#/projects');
  await expect(page.getByTestId('garment-card')).toHaveCount(5);
  await expect(page.locator('main')).toHaveScreenshot('wp11c-library-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });

  await page.setViewportSize({ height: 1366, width: 1024 });
  await page.waitForTimeout(250);
  await expect(page).toHaveScreenshot('wp11c-library-ipad.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.waitForTimeout(250);
  await expect(page).toHaveScreenshot('wp11c-library-mobile.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });
});
