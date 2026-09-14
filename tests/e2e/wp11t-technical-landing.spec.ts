import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { createGarment, createStudioThroughUi, uniqueStudioIdentity } from './support';

test('WP11T-A keeps garments, release queue, issues, filtering, and technical routes connected', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11t-technical'));
  await createGarment(page, 'Aster Technical Coat');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;
  await createGarment(page, 'Nocturne Technical Shirt');

  await page.goto('/#/technical');
  await expect(page.getByRole('heading', { exact: true, name: 'Technical Studio' })).toBeVisible();
  await expect(page.getByTestId('technical-garment-board')).toContainText('Aster Technical Coat');
  await expect(page.getByTestId('technical-garment-board')).toContainText('Nocturne Technical Shirt');

  await page.getByRole('textbox', { name: 'Search garments' }).fill('Aster');
  await expect(page.getByTestId('technical-garment-board')).toContainText('Aster Technical Coat');
  await expect(page.getByTestId('technical-garment-board')).not.toContainText('Nocturne Technical Shirt');
  await page.getByRole('textbox', { name: 'Search garments' }).fill('');

  await page.getByRole('button', { name: 'Release queue' }).click();
  await expect(page.getByRole('heading', { name: 'Release queue' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Technical release queue' })).toContainText('Aster Technical Coat');

  await page.getByRole('button', { name: 'Issues' }).click();
  await expect(page.getByTestId('technical-issues-list')).toContainText('Technical specification has not been started');
  const asterIssue = page.getByTestId('technical-issues-list').getByRole('button').filter({ hasText: 'Aster Technical Coat' });
  await asterIssue.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`#/technical/${garmentId}$`));
  await expect(page.getByRole('heading', { name: 'Begin the technical specification' })).toBeVisible();
});

test('WP11T-A keeps the visual technical board readable at desktop, iPad, and mobile', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11t-technical-visual'));
  for (const title of ['Aster Technical Coat', 'Nocturne Technical Shirt', 'Selene Technical Dress']) await createGarment(page, title);
  await page.goto('/#/technical');

  await expect(page.locator('#main-content')).toHaveScreenshot('wp11t-technical-garments-desktop.png', { animations: 'disabled', maxDiffPixelRatio: 0.015 });
  await page.getByRole('button', { name: 'Release queue' }).click();
  await expect(page.locator('#main-content')).toHaveScreenshot('wp11t-technical-release-queue-desktop.png', { animations: 'disabled', maxDiffPixelRatio: 0.015 });
  await page.getByRole('button', { name: 'Issues' }).click();
  await expect(page.locator('#main-content')).toHaveScreenshot('wp11t-technical-issues-desktop.png', { animations: 'disabled', maxDiffPixelRatio: 0.015 });

  await page.setViewportSize({ height: 1180, width: 834 });
  await page.getByTestId('technical-studio-landing').getByRole('button', { name: 'Garments' }).click();
  await expect(page.locator('#main-content')).toHaveScreenshot('wp11t-technical-garments-ipad.png', { animations: 'disabled', maxDiffPixelRatio: 0.015 });

  await page.setViewportSize({ height: 844, width: 390 });
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(horizontalOverflow).toBe(false);
  await expect(page.locator('#main-content')).toHaveScreenshot('wp11t-technical-garments-mobile.png', { animations: 'disabled', maxDiffPixelRatio: 0.015 });
});

test('WP11T-A exposes labelled technical views without detectable WCAG A/AA violations', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11t-technical-axe'));
  await createGarment(page, 'Accessible Technical Coat');
  await page.goto('/#/technical');
  for (const view of ['Garments', 'Release queue', 'Issues']) {
    await page.getByTestId('technical-studio-landing').getByRole('button', { name: view }).click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations, `${view} accessibility violations`).toEqual([]);
  }
});
