import { expect, test } from '@playwright/test';
import { createGarment, createStudioThroughUi, uniqueStudioIdentity } from './support';

test('WP11P-C creates, edits, completes, reopens, groups, frees, and deletes one canonical task', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11p-pinboard'));
  await createGarment(page, 'Pinboard Jacket');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;

  await page.goto('/#/kanban');
  await page.getByRole('tab', { name: 'Tasks' }).click();
  await page.getByRole('button', { name: 'New task' }).last().click();
  await page.getByLabel('Task title').fill('Review collar balance');
  await page.getByLabel('Notes').fill('Check the curve at the centre front.');
  await page.getByLabel('Garment').selectOption(garmentId);
  await page.getByLabel('Due date').fill('2026-09-03');
  await page.getByLabel('Priority').selectOption('high');
  await page.getByRole('button', { name: 'Save' }).click();

  const task = page.getByTestId('task-note').filter({ hasText: 'Review collar balance' });
  await expect(task).toBeVisible();
  await task.getByRole('button', { name: 'Open task Review collar balance' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByLabel('Priority').selectOption('urgent');
  await page.getByRole('dialog').getByLabel('Status').selectOption('in_progress');
  await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
  await expect(task).toContainText('urgent');

  await task.getByRole('button', { name: 'Complete Review collar balance' }).click();
  await expect(page.getByText('Completed · 1')).toBeVisible();
  await page.getByRole('button', { name: /Completed · 1/ }).click();
  const archived = page.getByTestId('task-note').filter({ hasText: 'Review collar balance' });
  await archived.getByRole('button', { name: 'Reopen Review collar balance' }).click();
  await expect(page.getByTestId('task-note').filter({ hasText: 'Review collar balance' })).toBeVisible();

  await page.getByRole('tab', { name: 'Garment' }).click();
  await expect(page.getByRole('button', { name: 'Open Pinboard Jacket' }).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Due date' }).click();
  await expect(page.getByText('This week').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Freeform' }).click();
  await expect(page.getByTestId('task-freeform-board')).toBeVisible();
  await page.getByRole('button', { name: 'Move Review collar balance on pinboard' }).dragTo(page.getByTestId('task-freeform-board'));
  await page.reload();
  await page.getByRole('tab', { name: 'Tasks' }).click();
  await page.getByRole('tab', { name: 'Freeform' }).click();
  await expect(page.getByTestId('task-freeform-board')).toContainText('Review collar balance');

  await page.getByRole('button', { name: 'Open task Review collar balance' }).click();
  await page.getByRole('button', { name: 'Delete task' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('The pinboard is clear')).toBeVisible();
  await page.getByRole('tab', { name: 'Calendar' }).click();
  await expect(page.getByText('Review collar balance')).toHaveCount(0);
});

test('WP11P-C pinboard holds its calm desktop, iPad, and mobile task layouts', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11p-pinboard-visual'));
  await createGarment(page, 'Pinboard Visual Jacket');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;
  await page.goto('/#/kanban');
  await page.getByRole('tab', { name: 'Tasks' }).click();
  await page.getByRole('button', { name: 'New task' }).last().click();
  await page.getByLabel('Task title').fill('Review sleeve pitch');
  await page.getByLabel('Garment').selectOption(garmentId);
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('main')).toHaveScreenshot('wp11p-task-pinboard-desktop.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  await page.setViewportSize({ height: 1366, width: 1024 });
  await expect(page.locator('main')).toHaveScreenshot('wp11p-task-pinboard-ipad.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  await page.setViewportSize({ height: 844, width: 390 });
  await expect(page.locator('main')).toHaveScreenshot('wp11p-task-pinboard-mobile.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
});
