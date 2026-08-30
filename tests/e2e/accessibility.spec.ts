import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { createGarment, createStudioThroughUi, uniqueStudioIdentity } from './support';

test('authenticated desktop and field-mode routes have no detectable WCAG A/AA violations', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('axe'));
  await createGarment(page, 'Accessibility Field Jacket');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;
  for (const route of ['#/today', '#/projects', `#/projects/${garmentId}`, '#/fabrics', `#/technical/${garmentId}`, `#/production/${garmentId}`, '#/lookbooks', '#/portfolio', '#/versions', '#/ai', '#/stats', '#/settings']) {
    await page.goto(`/${route}`);
    await expect(page.locator('#main-content')).toBeVisible();
    const desktop = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(desktop.violations, `${route} desktop violations`).toEqual([]);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['#/today', '#/projects', `#/projects/${garmentId}`, '#/fabrics', `#/production/${garmentId}`, '#/versions', '#/ai', '#/settings']) {
    await page.goto(`/${route}`);
    await expect(page.locator('#main-content')).toBeVisible();
    const fieldMode = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(fieldMode.violations, `${route} field-mode violations`).toEqual([]);
  }
});

test('anonymous portfolio error route has no detectable WCAG A/AA violations', async ({ page }) => {
  await page.goto('/portfolio/not-a-public-profile');
  await expect(page.getByRole('main')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
});
