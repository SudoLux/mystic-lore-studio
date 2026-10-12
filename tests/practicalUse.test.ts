import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database.generated';
import { createSessionFetch } from '../src/lib/sessionFetch';
import { authFailureMessage, isInvalidAuthSession, normalizeAuthEmail, signupGuidance } from '../src/lib/authIdentity';
import { readStoredStudioData } from '../src/lib/studioStorage';
import { CanonicalIndexedDb, emptyCanonicalWorkspaceState, SupabaseCanonicalWorkspaceRepository } from '../src/domains/persistence';
import { clearCanonicalMediaSessionCaches, resolveCanonicalMediaUrl, uploadStagedCanonicalMedia } from '../src/domains/persistence/canonicalMedia';
import { previewStudioRemoval } from '../src/lib/studioRemoval';

const stubClient = {} as SupabaseClient<Database>;
const studio = 'aa200000-0000-4000-8000-000000000001';
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); clearCanonicalMediaSessionCaches(); });

describe('practical use regression coverage', () => {
  it('normalizes all equivalent email identities and gives confirmation-aware recovery guidance', () => {
    expect(['auriumdesigns@gmail.com', 'AURIUMDESIGNS@GMAIL.COM', '  AuriumDesigns@gmail.com  '].map(normalizeAuthEmail)).toEqual(Array(3).fill('auriumdesigns@gmail.com'));
    expect(signupGuidance(false)).toContain('Sign in or reset your password');
    expect(signupGuidance(false)).not.toContain('Account created');
    expect(authFailureMessage({ code: 'email_exists', message: 'duplicate' })).toContain('existing account');
    expect(normalizeAuthEmail('auriumdesign@gmail.com')).not.toBe(normalizeAuthEmail('auriumdesigns@gmail.com'));
  });

  it('invalidates deleted/banned sessions while preserving sessions on network failures', () => {
    expect(isInvalidAuthSession({ status: 400, code: 'user_not_found' })).toBe(true);
    expect(isInvalidAuthSession({ status: 400, code: 'session_not_found' })).toBe(true);
    expect(isInvalidAuthSession({ status: 403, code: 'user_banned' })).toBe(true);
    expect(isInvalidAuthSession({ status: 503 })).toBe(false);
    expect(isInvalidAuthSession(null)).toBe(false);
  });

  it('does not seed or import a global or another account’s legacy cache at authenticated startup', () => {
    const getItem = vi.fn((key: string) => key === 'mystic-lore-studio:data' ? '{"projects":[{"id":"old"}]}' : null);
    vi.stubGlobal('window', { localStorage: { getItem, setItem: vi.fn() } });
    const data = readStoredStudioData('different-user');
    expect(data.projects).toEqual([]);
    expect(data.tasks).toEqual([]);
    expect(data.fabrics).toEqual([]);
    expect(getItem).toHaveBeenCalledTimes(1);
    expect(getItem).not.toHaveBeenCalledWith('mystic-lore-studio:data');
  });

  it('marks a network fallback as cache and never treats it as a successful refresh', async () => {
    const cache = new CanonicalIndexedDb();
    const state = emptyCanonicalWorkspaceState(studio);
    await cache.putWorkspace(state);
    const repo = new SupabaseCanonicalWorkspaceRepository(stubClient, cache);
    const load = vi.spyOn(repo as unknown as { loadCloudState: (id: string) => Promise<typeof state> }, 'loadCloudState').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(repo.hydrate(studio)).resolves.toEqual(state);
    expect(repo.lastLoad).toMatchObject({ source: 'cache', confirmedAt: null });
    await expect(repo.refresh()).rejects.toThrow('Failed to fetch');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('refuses cache fallback for revoked permissions and schema failures', async () => {
    const cache = new CanonicalIndexedDb();
    const id = `${studio}-permission`;
    const state = emptyCanonicalWorkspaceState(id);
    await cache.putWorkspace(state);
    const repo = new SupabaseCanonicalWorkspaceRepository(stubClient, cache);
    const load = vi.spyOn(repo as unknown as { loadCloudState: (id: string) => Promise<typeof state> }, 'loadCloudState');
    load.mockRejectedValueOnce({ code: '42501', message: 'permission denied' });
    await expect(repo.hydrate(id)).rejects.toMatchObject({ code: '42501' });
    load.mockRejectedValueOnce({ code: 'PGRST106', message: 'schema not exposed' });
    await expect(repo.hydrate(id)).rejects.toMatchObject({ code: 'PGRST106' });
  });

  it('does not overwrite an optimistic cache when a fresh read finishes', async () => {
    const id = `${studio}-race`;
    const cache = new CanonicalIndexedDb();
    const cloud = emptyCanonicalWorkspaceState(id);
    const repo = new SupabaseCanonicalWorkspaceRepository(stubClient, cache);
    const load = vi.spyOn(repo as unknown as { loadCloudState: (id: string) => Promise<typeof cloud> }, 'loadCloudState').mockResolvedValue(cloud);
    await repo.hydrate(id);
    let release!: (state: typeof cloud) => void;
    load.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const reading = repo.refresh();
    const optimistic = { ...cloud, collections: [{ id: 'new', studioId: id, name: 'Offline creation', season: '', sortOrder: 0, status: 'draft' as const, revision: 1, createdAt: '2026-10-11', updatedAt: '2026-10-11' }] };
    await cache.putWorkspace(optimistic);
    release(cloud);
    await reading;
    expect((await cache.getWorkspace(id))?.collections).toEqual(optimistic.collections);
    expect(repo.lastLoad?.source).toBe('cloud');
  });

  it('does not reuse private signed image links across accounts or after logout', async () => {
    const sign = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.invalid/private' }, error: null });
    const client = { storage: { from: () => ({ createSignedUrl: sign }) } } as unknown as SupabaseClient<Database>;
    const asset = { storagePath: 'studios/test/scoped.jpg' };
    await resolveCanonicalMediaUrl(asset, client, { scope: 'account-a' });
    await resolveCanonicalMediaUrl(asset, client, { scope: 'account-a' });
    await resolveCanonicalMediaUrl(asset, client, { scope: 'account-b' });
    expect(sign).toHaveBeenCalledTimes(2);
    clearCanonicalMediaSessionCaches();
    await resolveCanonicalMediaUrl(asset, client, { scope: 'account-a' });
    expect(sign).toHaveBeenCalledTimes(3);
  });

  it('renews a signed link before expiry and surfaces denied signing', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const sign = vi.fn().mockResolvedValueOnce({ data: { signedUrl: 'first' }, error: null }).mockResolvedValueOnce({ data: { signedUrl: 'renewed' }, error: null }).mockResolvedValueOnce({ data: null, error: { message: 'Access denied' } });
    const client = { storage: { from: () => ({ createSignedUrl: sign }) } } as unknown as SupabaseClient<Database>;
    const asset = { storagePath: 'renewal.jpg' };
    await resolveCanonicalMediaUrl(asset, client);
    vi.mocked(Date.now).mockReturnValue(1000 + (6 * 60 - 4) * 60 * 1000);
    await expect(resolveCanonicalMediaUrl(asset, client)).resolves.toBe('renewed');
    await expect(resolveCanonicalMediaUrl(asset, client, { force: true })).rejects.toThrow('Access denied');
  });

  it('refuses metadata upload when interrupted capture has no bytes and no cloud object', async () => {
    const client = { storage: { from: () => ({ download: async () => ({ data: null, error: { message: 'not found' } }) }) } } as unknown as SupabaseClient<Database>;
    await expect(uploadStagedCanonicalMedia({ id: 'missing-capture', checksum: 'checksum', mimeType: 'image/png', storagePath: 'missing.png' }, new CanonicalIndexedDb(), client)).rejects.toThrow('original file is missing');
  });

  it('drains an edit queued during another in-flight save without another user click', async () => {
    const id = `${studio}-flush-race`;
    const cache = new CanonicalIndexedDb();
    const state = emptyCanonicalWorkspaceState(id);
    const repo = new SupabaseCanonicalWorkspaceRepository(stubClient, cache);
    vi.spyOn(repo as unknown as { loadCloudState: () => Promise<typeof state> }, 'loadCloudState').mockResolvedValue(state);
    await repo.hydrate(id);
    let release!: () => void;
    let started!: () => void;
    const firstStarted = new Promise<void>((resolve) => { started = resolve; });
    const sending = vi.spyOn(repo as unknown as { send: (op: unknown) => Promise<unknown> }, 'send')
      .mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ status: 'applied', authoritativeRows: [], eventIds: [], operationId: 'first' }); started(); }))
      .mockResolvedValue({ status: 'applied', authoritativeRows: [], eventIds: [], operationId: 'second' });
    const operation = (operationId: string) => ({ operationId, studioId: id, garmentId: null, origin: 'user' as const, queuedAt: '2026-10-11T00:00:00Z', mutations: [] });
    const first = repo.dispatch(operation('first'));
    await firstStarted;
    const second = repo.dispatch(operation('second'));
    // Wait until the second request is durable while the first request is blocked.
    for (let attempt = 0; attempt < 20 && (await cache.listOutbox(id)).length < 2; attempt++) await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await cache.listOutbox(id)).toHaveLength(2);
    release();
    await Promise.all([first.committed, second.committed]);
    expect(sending).toHaveBeenCalledTimes(2);
    expect(await cache.listOutbox(id)).toHaveLength(0);
  });

  it('retries the observed fresh-token rejection with an identical request, but does not retry revoked access', async () => {
    const future = () => new Response(JSON.stringify({ message: 'JWT issued at future' }), { status: 401 });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(future()).mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const wait = vi.fn().mockResolvedValue(undefined);
    const request = createSessionFetch(fetcher, wait);
    expect((await request('https://example.invalid/rest/v1/rpc/command', { method: 'POST', body: '{"operation":"same"}' })).ok).toBe(true);
    expect(await (fetcher.mock.calls[0][0] as Request).text()).toBe(await (fetcher.mock.calls[1][0] as Request).text());
    expect(wait).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'User revoked' }), { status: 401 }));
    expect((await request('https://example.invalid/rest/v1/garments')).status).toBe(401);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('does not acknowledge a cache write before its durable transaction finishes, and rejects aborts', async () => {
    let opening: { result: unknown; onsuccess?: () => void };
    const request = { result: 'id', onsuccess: undefined as undefined | (() => void) };
    const transaction = { objectStore: () => ({ put: () => request }), oncomplete: undefined as undefined | (() => void), onabort: undefined as undefined | (() => void), error: new Error('Quota exhausted') };
    const database = { transaction: () => transaction, close: vi.fn() };
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    vi.stubGlobal('indexedDB', { open: () => { opening = { result: database }; return opening; } });
    let acknowledged = false;
    const writing = new CanonicalIndexedDb().putSetting('durability-qa', 'value').then(() => { acknowledged = true; });
    const failed = expect(writing).rejects.toThrow('Quota exhausted');
    opening!.onsuccess!();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    request.onsuccess!();
    await Promise.resolve();
    expect(acknowledged).toBe(false);
    transaction.onabort!();
    await failed;
    expect(database.close).toHaveBeenCalled();
  });

  it('protects sample material inventory history in the deletion preview', () => {
    const state = emptyCanonicalWorkspaceState(studio);
    state.inventoryEntries = [{ variantId: 'used', id: 'ledger' }] as typeof state.inventoryEntries;
    expect(previewStudioRemoval(state, 'material_variant', 'used').blocked).toContain('inventory');
    expect(previewStudioRemoval(state, 'material_variant', 'unused').blocked).toBeNull();
  });
});
