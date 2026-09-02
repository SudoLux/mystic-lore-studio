import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createGarment, createStudioThroughUi, uniqueStudioIdentity } from './support';

function localDate(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

async function createTask(page: Page, title: string, garmentId: string, dueDate = '') {
  await page.getByRole('button', { name: 'New task' }).last().click();
  await page.getByLabel('Task title').fill(title);
  await page.getByLabel('Garment').selectOption(garmentId);
  if (dueDate) await page.getByLabel('Due date').fill(dueDate);
  await page.getByRole('button', { name: 'Save' }).click();
}

test('WP11P-E keeps Flow, Tasks, and Calendar connected to one canonical plan', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11p-integration'));
  await createGarment(page, 'Integration Jacket');
  const jacketId = new URL(page.url()).hash.split('/').at(-1)!;
  await createGarment(page, 'Integration Shirt');
  const shirtId = new URL(page.url()).hash.split('/').at(-1)!;
  const firstDate = localDate(1);
  const movedDate = localDate(3);

  await page.goto('/#/kanban');
  await page.getByRole('tab', { name: 'Tasks' }).click();
  await createTask(page, 'Review jacket balance', jacketId, firstDate);
  await createTask(page, 'Source shirt buttons', shirtId);

  await page.getByRole('tab', { name: 'Flow' }).click();
  const stage = page.getByTestId(`flow-stage-${jacketId}`);
  await stage.selectOption('sampling');
  await expect(stage).toHaveValue('sampling');
  await page.reload();
  await expect(page.getByTestId(`flow-stage-${jacketId}`)).toHaveValue('sampling');

  await page.getByRole('button', { name: 'View 1 open task for Integration Jacket' }).click();
  await expect(page.getByRole('tab', { name: 'Tasks' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Showing work for')).toBeVisible();
  await expect(page.getByText('Review jacket balance')).toBeVisible();
  await expect(page.getByText('Source shirt buttons')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show all tasks' }).click();
  await expect(page.getByText('Source shirt buttons')).toBeVisible();

  await page.getByRole('tab', { name: 'Calendar' }).click();
  const taskChip = page.getByRole('button', { name: 'Open Review jacket balance' });
  await expect(taskChip).toHaveCount(1);
  await taskChip.click();
  await page.getByRole('dialog').getByLabel('Due date').fill(movedDate);
  await page.getByRole('dialog').getByLabel('Status').selectOption('done');
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByTestId(`calendar-day-${movedDate}`)).toContainText('Review jacket balance');
  await expect(page.getByRole('button', { name: 'Open Review jacket balance' })).toHaveClass(/line-through/);
  await page.reload();
  await page.getByRole('tab', { name: 'Calendar' }).click();
  await expect(page.getByRole('button', { name: 'Open Review jacket balance' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Open Review jacket balance' })).toHaveClass(/line-through/);

  await page.getByTestId(`calendar-day-${movedDate}`).getByRole('button', { name: /Select/ }).click();
  await page.getByRole('button', { name: 'Open Integration Jacket' }).last().click();
  await expect(page).toHaveURL(new RegExp(`#/projects/${jacketId}$`));
});

test('WP11P-E presents a coherent, accessible Plan at desktop, iPad, and mobile sizes', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11p-integration-visual'));
  await createGarment(page, 'Atelier Calendar Coat');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;
  const dueDate = localDate(2);

  await page.goto('/#/kanban');
  await page.getByRole('tab', { name: 'Tasks' }).click();
  await createTask(page, 'Approve final sleeve shape', garmentId, dueDate);

  await page.getByRole('tab', { name: 'Flow' }).click();
  await expect(page.locator('main')).toHaveScreenshot('wp11p-e-flow-desktop.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  const flowA11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(flowA11y.violations).toEqual([]);

  await page.getByRole('button', { name: 'View 1 open task for Atelier Calendar Coat' }).click();
  await expect(page.locator('main')).toHaveScreenshot('wp11p-e-tasks-filtered-desktop.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  const tasksA11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(tasksA11y.violations).toEqual([]);

  await page.getByRole('tab', { name: 'Calendar' }).click();
  await expect(page.locator('main')).toHaveScreenshot('wp11p-e-calendar-desktop.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  const calendarA11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(calendarA11y.violations).toEqual([]);

  for (const viewport of [
    { height: 900, label: 'laptop', width: 1440 },
    { height: 834, label: 'ipad-landscape', width: 1194 },
    { height: 1194, label: 'ipad-portrait', width: 834 },
    { height: 844, label: 'mobile', width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.getByRole('tab', { name: 'Flow' }).click();
    const flowRegion = page.getByRole('region', { name: 'Garment development flow' });
    const flowDimensions = await flowRegion.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
    expect(flowDimensions.scrollWidth, `${viewport.label} Flow should retain horizontal movement`).toBeGreaterThan(flowDimensions.clientWidth);

    await page.getByRole('tab', { name: 'Tasks' }).click();
    await expect(page.getByRole('heading', { name: 'What moves the work forward' })).toBeVisible();
    await page.getByRole('tab', { name: 'Calendar' }).click();
    const dimensions = await page.locator('#main-content').evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
    expect(dimensions.scrollWidth, `${viewport.label} Plan shell should not overflow`).toBeLessThanOrEqual(dimensions.clientWidth);
  }
  await page.getByTestId(`calendar-day-${dueDate}`).getByRole('button', { name: /Select/ }).click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(250);
  await expect(page.locator('.skip-link')).not.toBeFocused();
  await expect(page.locator('main')).toHaveScreenshot('wp11p-e-calendar-mobile.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
});
