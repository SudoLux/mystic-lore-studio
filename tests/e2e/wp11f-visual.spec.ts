import { expect, test } from '@playwright/test';
import { createGarment, createStudioThroughUi, uniqueStudioIdentity } from './support';

const viewports = [
  { height: 800, name: 'laptop', width: 1280 },
  { height: 1366, name: 'ipad-portrait', width: 1024 },
  { height: 1024, name: 'ipad-landscape', width: 1366 },
  { height: 844, name: 'mobile', width: 390 },
] as const;

test('WP11F keeps every primary Studio route readable across target devices', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11f-responsive'));
  await createGarment(page, 'Nocturne Field Jacket');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;
  const routes = [
    '/#/today',
    '/#/projects',
    `/#/projects/${garmentId}`,
    '/#/fabrics',
    `/#/technical/${garmentId}`,
    `/#/production/${garmentId}`,
    '/#/lookbooks',
    '/#/portfolio',
    '/#/versions',
    '/#/ai',
    '/#/stats',
    '/#/settings',
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('#main-content')).toBeVisible();
      await expect(page.locator('h1:visible').first(), `${viewport.name} ${route} needs a visible title`).toBeVisible();
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(horizontalOverflow, `${viewport.name} ${route} should not overflow horizontally`).toBe(false);
    }
  }
});

test('WP11F creative assistance and settings retain the premium quiet hierarchy', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11f-visual'));
  await createGarment(page, 'Nocturne Field Jacket');

  await page.goto('/#/ai');
  await expect(page.getByTestId('specialist-garment-context')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Creative Assistance' })).toBeVisible();
  await expect(page.locator('#main-content')).toHaveScreenshot('wp11f-assistant-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });

  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Studio Settings' })).toBeVisible();
  await expect(page.getByText('Advanced reliability details')).toBeVisible();
  await expect(page.locator('#main-content')).toHaveScreenshot('wp11f-settings-desktop.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.waitForTimeout(250);
  await expect(page).toHaveScreenshot('wp11f-settings-mobile.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.015,
  });
});
