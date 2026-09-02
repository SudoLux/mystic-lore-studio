import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { createGarment, createStudioThroughUi, uniqueStudioIdentity } from './support';

const flatSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200"><rect width="800" height="1200" fill="white"/><path d="M250 170h300l110 190-80 570H220l-80-570z" fill="none" stroke="black" stroke-width="12"/></svg>';

test('WP11T Flats keeps the white canvas, required view states, drag upload, and anchored annotation workflow connected', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11t-flats'));
  await createGarment(page, 'Flats Workspace Jacket');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;

  await page.goto(`/#/technical/${garmentId}`);
  await page.getByRole('button', { name: /Start with size M/ }).click();
  await expect(page.getByTestId('flats-workspace')).toBeVisible();
  await expect(page.getByRole('button', { name: /Front: Required · missing/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Back: Required · missing/ })).toBeVisible();
  await expect(page.getByTestId('flat-canvas')).toContainText('Drop your Front Flat here');

  await page.getByTestId('flat-canvas').evaluate((element, svg) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([svg], 'front-flat.svg', { type: 'image/svg+xml' }));
    for (const eventName of ['dragenter', 'dragover', 'drop']) element.dispatchEvent(new DragEvent(eventName, { bubbles: true, cancelable: true, dataTransfer }));
  }, flatSvg);

  await expect(page.getByTestId('flat-canvas').getByRole('img', { name: 'front-flat.svg technical source' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Front: Source uploaded/ })).toBeVisible();
  await page.getByRole('button', { name: 'Annotate' }).click();
  await page.getByTestId('flat-canvas').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { exact: true, name: 'Callout' }).fill('Confirm collar stand');
  await page.getByRole('button', { name: 'Save callout' }).click();
  await expect(page.getByLabel('Front flat inspector')).toContainText('Confirm collar stand');

  await page.getByRole('button', { name: 'Validate' }).click();
  await expect(page.getByLabel('Front flat inspector')).toContainText('Back flat is required.');
});

test('WP11T Flats keeps the first-source workflow keyboard-labelled and accessible', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11t-flats-axe'));
  await createGarment(page, 'Accessible Flats Jacket');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;
  await page.goto(`/#/technical/${garmentId}`);
  await page.getByRole('button', { name: /Start with size M/ }).click();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations, 'Flats accessibility violations').toEqual([]);
});
