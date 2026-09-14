import { expect, test } from '@playwright/test';
import { createGarment, createStudioThroughUi, uniqueStudioIdentity } from './support';

test('WP11P-B Flow keeps every stage control, drag path, reload, and garment route connected', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11p-flow'));
  await createGarment(page, 'Flow Jacket');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;

  await page.goto('/#/kanban');
  await expect(page.getByTestId('flow-card')).toHaveCount(1);
  const stageSelect = page.getByTestId(`flow-stage-${garmentId}`);

  const dragHandle = page.getByRole('button', { name: 'Drag Flow Jacket to another stage' });
  await dragHandle.dragTo(page.getByTestId('flow-column-design'));
  await expect(stageSelect).toHaveValue('design');
  await page.waitForTimeout(750);
  await page.reload();
  await expect(page.getByTestId(`flow-stage-${garmentId}`)).toHaveValue('design');

  await stageSelect.selectOption('sampling');
  await expect(stageSelect).toHaveValue('sampling');
  await expect(page.getByTestId('flow-column-sampling')).toContainText('Flow Jacket');
  await page.waitForTimeout(750);
  await page.reload();
  await expect(page.getByTestId(`flow-stage-${garmentId}`)).toHaveValue('sampling');

  await page.getByRole('button', { name: /Open Flow Jacket/ }).click();
  await expect(page).toHaveURL(new RegExp(`#/projects/${garmentId}$`));
});

test('WP11P-B Flow renders its intentional desktop, iPad, and mobile board layouts', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11p-flow-visual'));
  for (const title of ['Flow Brief Jacket', 'Flow Design Shirt', 'Flow Sampling Coat']) await createGarment(page, title);

  await page.goto('/#/kanban');
  const cards = page.getByTestId('flow-card');
  await expect(cards).toHaveCount(3);
  const selectIds = await page.getByTestId(/flow-stage-/).evaluateAll((elements) => elements.map((element) => element.getAttribute('data-testid')!));
  const designSelect = page.getByTestId(selectIds[1]);
  const samplingSelect = page.getByTestId(selectIds[2]);
  await designSelect.selectOption('design');
  await expect(designSelect).toHaveValue('design');
  await page.waitForTimeout(750);
  await samplingSelect.selectOption('sampling');
  await expect(samplingSelect).toHaveValue('sampling');
  await page.waitForTimeout(750);

  await expect(page.locator('main')).toHaveScreenshot('wp11p-flow-desktop.png', { animations: 'disabled', maxDiffPixelRatio: 0.015 });

  await page.setViewportSize({ height: 1366, width: 1024 });
  await expect(page.locator('main')).toHaveScreenshot('wp11p-flow-ipad.png', { animations: 'disabled', maxDiffPixelRatio: 0.015 });

  await page.setViewportSize({ height: 844, width: 390 });
  await expect(page.locator('main')).toHaveScreenshot('wp11p-flow-mobile.png', { animations: 'disabled', maxDiffPixelRatio: 0.015 });
});
