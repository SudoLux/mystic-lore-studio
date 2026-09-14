import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createGarment, createStudioThroughUi, uniqueStudioIdentity } from './support';

const flatSvg = (label: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200"><rect width="800" height="1200" fill="white"/><path d="M250 170h300l110 190-80 570H220l-80-570z" fill="none" stroke="black" stroke-width="12"/><text x="400" y="1060" text-anchor="middle" font-size="52">${label}</text></svg>`;

async function uploadSelectedFlat(page: Page, name: string, svg: string) {
  await page.getByTestId('flat-canvas').evaluate((element, payload) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([payload.svg], payload.name, { type: 'image/svg+xml' }));
    for (const eventName of ['dragenter', 'dragover', 'drop']) element.dispatchEvent(new DragEvent(eventName, { bubbles: true, cancelable: true, dataTransfer }));
  }, { name, svg });
  await expect(page.getByTestId('flat-canvas').getByRole('img', { name: `${name} technical source` })).toBeVisible();
}

test('WP11T POM maps canonical Front and Back flats with direct, view-specific placement', async ({ page }) => {
  await createStudioThroughUi(page, uniqueStudioIdentity('wp11t-pom'));
  await createGarment(page, 'POM Workspace Jacket');
  const garmentId = new URL(page.url()).hash.split('/').at(-1)!;
  await page.goto(`/#/technical/${garmentId}`);
  await page.getByRole('button', { name: /Start with size M/ }).click();

  await uploadSelectedFlat(page, 'front-pom-flat.svg', flatSvg('FRONT'));
  await page.getByRole('button', { name: /Back: Required · missing/ }).click();
  await uploadSelectedFlat(page, 'back-pom-flat.svg', flatSvg('BACK'));
  await page.getByRole('button', { exact: true, name: 'POM' }).click();

  await expect(page.getByTestId('pom-flat-front').getByRole('img', { name: 'Front technical flat' })).toBeVisible();
  await expect(page.getByTestId('pom-flat-back').getByRole('img', { name: 'Back technical flat' })).toBeVisible();
  await page.getByLabel('POM canvas controls').getByRole('button', { name: 'Add POM' }).click();
  await page.getByLabel('POM inspector').getByLabel('Code').fill('SW');
  await page.getByLabel('POM inspector').getByLabel('Name').fill('Shoulder width');
  await page.getByLabel('POM inspector').getByLabel('Measurement method').fill('Measure shoulder point to shoulder point');
  await page.getByRole('button', { name: 'Place on canvas' }).click();
  await page.getByTestId('pom-flat-back').getByRole('button', { name: 'Place POM on Back flat' }).click({ position: { x: 180, y: 140 } });

  const marker = page.getByTestId('pom-flat-back').getByRole('button', { name: /SW: Shoulder width/ });
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('POM inspector')).toContainText('Back');
  await page.getByRole('button', { name: 'Re-place' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('POM placement cancelled.')).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations, 'POM workspace accessibility violations').toEqual([]);
});
