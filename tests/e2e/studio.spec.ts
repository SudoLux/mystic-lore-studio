import { expect, test } from '@playwright/test';
import {
  createGarment,
  createStudioThroughUi,
  disconnectCanonicalTransport,
  expectNoCanonicalGraphInLocalStorage,
  installCanonicalTransportToggle,
  reconnectAndConverge,
  signIn,
  uniqueStudioIdentity,
} from './support';

test('canonical UI writes survive offline reload, converge, and appear on a second device only', async ({ browser, page }) => {
  await installCanonicalTransportToggle(page);
  const owner = await createStudioThroughUi(page, uniqueStudioIdentity('owner'));
  await expectNoCanonicalGraphInLocalStorage(page);

  const onlineTitle = `Cloud Coat ${crypto.randomUUID().slice(0, 8)}`;
  await createGarment(page, onlineTitle);
  await expect(page.getByRole('button', { name: /Synced/ })).toBeVisible();

  const offlineTitle = `Offline Coat ${crypto.randomUUID().slice(0, 8)}`;
  await disconnectCanonicalTransport(page);
  await createGarment(page, offlineTitle);
  await expect(page.getByText('Saved on this device. Your changes will sync when you reconnect.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: offlineTitle })).toBeVisible();
  await reconnectAndConverge(page);

  const secondDevice = await browser.newContext();
  const secondPage = await secondDevice.newPage();
  await signIn(secondPage, owner.email);
  await secondPage.goto('/#/projects');
  await expect(secondPage.getByText(onlineTitle, { exact: true })).toBeVisible();
  await expect(secondPage.getByText(offlineTitle, { exact: true })).toBeVisible();
  await expectNoCanonicalGraphInLocalStorage(secondPage);
  await secondDevice.close();

  const strangerContext = await browser.newContext();
  const strangerPage = await strangerContext.newPage();
  await createStudioThroughUi(strangerPage, uniqueStudioIdentity('stranger'));
  await strangerPage.goto('/#/projects');
  await expect(strangerPage.getByText(onlineTitle, { exact: true })).toHaveCount(0);
  await expect(strangerPage.getByText(offlineTitle, { exact: true })).toHaveCount(0);
  await strangerContext.close();
});

test('anonymous portfolio route never hydrates the authenticated Studio shell', async ({ page }) => {
  await page.goto('/portfolio/not-a-public-profile');
  await expect(page.getByRole('heading', { name: /not published yet/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Synced/ })).toHaveCount(0);
  await expectNoCanonicalGraphInLocalStorage(page);
});
