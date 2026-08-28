import { expect, type Page } from '@playwright/test';
import { spawnSync } from 'node:child_process';

export const e2ePassword = 'MysticLore-E2E-2026!';

export function uniqueStudioIdentity(prefix: string) {
  const nonce = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  return {
    email: `${prefix}-${nonce}@example.test`,
    studioName: `Mystic Lore ${prefix} ${nonce.slice(-8)}`,
  };
}

export async function createStudioThroughUi(
  page: Page,
  identity = uniqueStudioIdentity('e2e'),
) {
  await provisionIsolatedCloudStudio(identity);
  await signIn(page, identity.email);
  return identity;
}

export async function signIn(page: Page, email: string) {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(e2ePassword);
  await page.getByRole('button', { name: 'Sign In', exact: true }).last().click();
  await expect(page.getByRole('button', { name: /Synced/ })).toBeVisible({ timeout: 30_000 });
}

async function provisionIsolatedCloudStudio(identity: ReturnType<typeof uniqueStudioIdentity>) {
  const status = spawnSync('node_modules/.bin/supabase', ['status', '--output', 'json'], { encoding: 'utf8' });
  if (status.status !== 0) throw new Error(status.stderr || 'Local Supabase is unavailable.');
  const local = JSON.parse(status.stdout) as { API_URL?: string; SERVICE_ROLE_KEY?: string };
  if (!local.API_URL || !local.SERVICE_ROLE_KEY) throw new Error('Local Supabase status omitted its API URL or service-role key.');
  const authResponse = await fetch(`${local.API_URL}/auth/v1/admin/users`, {
    body: JSON.stringify({ email: identity.email, email_confirm: true, password: e2ePassword }),
    headers: adminHeaders(local.SERVICE_ROLE_KEY),
    method: 'POST',
  });
  const created = await authResponse.json() as { id?: string; message?: string };
  if (!authResponse.ok || !created.id) throw new Error(created.message ?? 'The E2E user was not created.');
  const studioId = crypto.randomUUID();
  const studio = await fetch(`${local.API_URL}/rest/v1/studios`, {
    body: JSON.stringify({
      id: studioId,
      name: identity.studioName,
      owner_user_id: created.id,
      slug: `e2e-${studioId}`,
      timezone: 'America/Los_Angeles',
    }),
    headers: adminHeaders(local.SERVICE_ROLE_KEY, true),
    method: 'POST',
  });
  if (!studio.ok) throw new Error(`The E2E Studio was not created: ${await studio.text()}`);
  const policy = await fetch(`${local.API_URL}/rest/v1/studio_settings?studio_id=eq.${studioId}`, {
    body: JSON.stringify({ version_policy: { canonicalPersistence: 'cloud' } }),
    headers: adminHeaders(local.SERVICE_ROLE_KEY, true),
    method: 'PATCH',
  });
  if (!policy.ok) throw new Error(`The E2E cloud policy was not applied: ${await policy.text()}`);
}

function adminHeaders(serviceRoleKey: string, privateSchema = false) {
  return {
    ...(privateSchema ? { 'Accept-Profile': 'ml_private', 'Content-Profile': 'ml_private' } : {}),
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

export async function createGarment(page: Page, title: string) {
  await page.goto('/#/projects');
  await expect(page.getByRole('heading', { name: 'Garment Library' })).toBeVisible();
  await page.getByRole('button', { name: 'New garment' }).click();
  await page.getByLabel('Garment title').fill(title);
  await page.getByRole('button', { name: 'Create garment' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

export async function expectNoCanonicalGraphInLocalStorage(page: Page) {
  const keys = await page.evaluate(() => Object.keys(window.localStorage)
    .filter((key) => key.includes('canonical-wp3')));
  expect(keys).toEqual([]);
}

export async function installCanonicalTransportToggle(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => window.localStorage.getItem('__ml-e2e-canonical-offline') !== 'true',
    });
  });
}

export async function disconnectCanonicalTransport(page: Page) {
  await page.route('http://127.0.0.1:54321/**', (route) => route.abort('internetdisconnected'));
  await page.evaluate(() => {
    window.localStorage.setItem('__ml-e2e-canonical-offline', 'true');
    window.dispatchEvent(new Event('offline'));
  });
}

export async function reconnectAndConverge(page: Page) {
  await page.unroute('http://127.0.0.1:54321/**');
  await page.evaluate(() => {
    window.localStorage.removeItem('__ml-e2e-canonical-offline');
    window.dispatchEvent(new Event('online'));
  });
  await expect(page.getByRole('button', { name: /Synced/ })).toBeVisible({ timeout: 30_000 });
}
