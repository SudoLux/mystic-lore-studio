import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { createGarment, createStudioThroughUi, uniqueStudioIdentity } from './support';

function localDate(daysFromToday = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

test('WP11P-D keeps calendar tasks and private appointments connected without duplicate records', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11p-calendar'));
  await createGarment(page, 'Calendar Jacket');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;
  const appointmentDate = localDate(2);
  const movedDate = localDate(4);

  await page.goto('/#/kanban');
  await page.getByRole('tab', { name: 'Tasks' }).click();
  await page.getByRole('button', { name: 'New task' }).last().click();
  await page.getByLabel('Task title').fill('Confirm final fitting notes');
  await page.getByLabel('Garment').selectOption(garmentId);
  await page.getByLabel('Due date').fill(appointmentDate);
  await page.getByRole('button', { name: 'Save' }).click();

  await page.getByRole('tab', { name: 'Calendar' }).click();
  await expect(page.getByRole('tab', { name: 'Month' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'New event' }).last().click();
  await page.getByLabel('Event title').fill('Calendar Jacket final fitting');
  await page.getByLabel('Type').selectOption('fitting');
  await page.getByLabel('Garment').selectOption(garmentId);
  await page.getByLabel('Start').fill(`${appointmentDate}T14:00`);
  await page.getByRole('textbox', { name: 'End optional' }).fill(`${appointmentDate}T15:00`);
  await page.getByRole('textbox', { name: 'Notes optional' }).fill('Bring sleeve and hem options.');
  await page.getByRole('button', { name: 'Save' }).click();

  const eventChip = page.getByRole('button', { name: 'Open Calendar Jacket final fitting' });
  const taskChip = page.getByRole('button', { name: 'Open Confirm final fitting notes' });
  await expect(eventChip).toBeVisible();
  await expect(taskChip).toBeVisible();

  await eventChip.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Notes' }).fill('Bring sleeve, hem, and collar options.');
  await page.getByRole('dialog').getByLabel('Start').fill(`${movedDate}T14:00`);
  await page.getByRole('dialog').getByRole('textbox', { name: 'End optional' }).fill(`${movedDate}T15:00`);
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
  await expect(eventChip).toBeVisible();
  await expect(page.getByTestId(`calendar-day-${movedDate}`)).toContainText('Calendar Jacket final fitting');

  await taskChip.click();
  await page.getByRole('dialog').getByLabel('Status').selectOption('done');
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
  await expect(taskChip).toHaveClass(/line-through/);

  await page.getByRole('tab', { name: 'Week' }).click();
  await expect(page.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Agenda' }).click();
  await expect(page.getByRole('tab', { name: 'Agenda' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Open Calendar Jacket' }).first().click();
  await expect(page).toHaveURL(new RegExp(`#/projects/${garmentId}$`));
});

test('WP11P-D calendar holds intentional desktop, iPad, and mobile layouts', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11p-calendar-visual'));
  await createGarment(page, 'Calendar Visual Jacket');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;
  const date = localDate(1);

  await page.goto('/#/kanban');
  await page.getByRole('tab', { name: 'Calendar' }).click();
  await page.getByRole('button', { name: 'New event' }).last().click();
  await page.getByLabel('Event title').fill('Review campaign sample');
  await page.getByLabel('Type').selectOption('review');
  await page.getByLabel('Garment').selectOption(garmentId);
  await page.getByLabel('Start').fill(`${date}T10:00`);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Open Review campaign sample' })).toBeVisible();

  await expect(page.locator('main')).toHaveScreenshot('wp11p-calendar-desktop.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  await page.setViewportSize({ height: 1366, width: 1024 });
  await expect(page.locator('main')).toHaveScreenshot('wp11p-calendar-ipad.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  await page.setViewportSize({ height: 844, width: 390 });
  const mobileWidth = await page.locator('#main-content').evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(mobileWidth.scrollWidth).toBeLessThanOrEqual(mobileWidth.clientWidth);
  await expect(page.locator('main')).toHaveScreenshot('wp11p-calendar-mobile.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
});

test('WP11P-D Calendar exposes labelled controls and no detectable WCAG A/AA violations', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11p-calendar-axe'));
  await page.goto('/#/kanban');
  await page.getByRole('tab', { name: 'Calendar' }).click();
  const calendar = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(calendar.violations).toEqual([]);
  await page.getByRole('button', { name: 'New event' }).last().click();
  const composer = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(composer.violations).toEqual([]);
});
