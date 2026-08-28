import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { createStudioThroughUi, uniqueStudioIdentity } from './support';

test('authenticated desktop and field-mode routes have no detectable WCAG A/AA violations', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('axe'));
  for (const route of ['#/projects', '#/technical', '#/production', '#/lookbooks', '#/portfolio', '#/settings']) {
    await page.goto(`/${route}`);
    await expect(page.getByRole('main')).toBeVisible();
    const desktop = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(desktop.violations, `${route} desktop violations`).toEqual([]);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['#/projects', '#/production', '#/settings']) {
    await page.goto(`/${route}`);
    await expect(page.getByRole('main')).toBeVisible();
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
