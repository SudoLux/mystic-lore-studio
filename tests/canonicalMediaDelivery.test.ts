import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { resolveCanonicalMediaUrl } from '../src/domains/persistence/canonicalMedia';
import type { Database } from '../src/types/database.generated';

describe('canonical private media delivery', () => {
  it('uses a six-hour member-authorized URL in memory and refreshes only when requested', async () => {
    const createSignedUrl = vi.fn()
      .mockResolvedValueOnce({ data: { signedUrl: 'https://private.example/first' }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://private.example/refreshed' }, error: null });
    const client = {
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    } as unknown as SupabaseClient<Database>;
    const asset = { storagePath: 'studios/test/assets/unique-delivery-test.jpg' };

    await expect(resolveCanonicalMediaUrl(asset, client)).resolves.toBe('https://private.example/first');
    await expect(resolveCanonicalMediaUrl(asset, client)).resolves.toBe('https://private.example/first');
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
    expect(createSignedUrl).toHaveBeenLastCalledWith(asset.storagePath, 6 * 60 * 60);

    await expect(resolveCanonicalMediaUrl(asset, client, { force: true })).resolves.toBe('https://private.example/refreshed');
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
  });
});
