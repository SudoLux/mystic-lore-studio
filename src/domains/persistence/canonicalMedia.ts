import type { SupabaseClient } from '@supabase/supabase-js';
import { canonicalSupabase } from '../../lib/supabase';
import type { Database } from '../../types/database.generated';
import type { CanonicalMediaAsset } from '../workspace';
import { CanonicalIndexedDb } from './canonicalIndexedDb';
import { canonicalValueChecksum } from './canonicalIndexedDb';

const cache = new CanonicalIndexedDb();
const CANONICAL_SIGNED_URL_SECONDS = 6 * 60 * 60;
const CANONICAL_SIGNED_URL_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const CANONICAL_SIGNED_URL_CACHE_KEY = 'mystic-lore:canonical-signed-media-urls:v2';

type CanonicalSignedUrlCacheEntry = {
  expiresAt: number;
  url: string;
};

const signedUrlCache = new Map<string, CanonicalSignedUrlCacheEntry>();

/** Retains bytes before any network work so capture survives interruption. */
export async function stageCanonicalMediaBlob(asset: CanonicalMediaAsset, blob: Blob) {
  const checksum = await sha256(blob);
  if (checksum !== asset.checksum) throw new Error('Media bytes do not match the canonical checksum.');
  await cache.putMediaBlob(asset.id, blob, checksum);
}

export async function loadCanonicalMediaBlob(asset: CanonicalMediaAsset) {
  return await loadCanonicalStoredBlob(asset);
}

/**
 * Resolves a private asset to a short-lived viewing URL after Storage RLS has
 * approved the current member session. The URL is intentionally ephemeral;
 * it is never persisted in the canonical graph or shared with public routes.
 */
export async function resolveCanonicalMediaUrl(
  asset: Pick<CanonicalMediaAsset, 'storagePath'>,
  client: SupabaseClient<Database> | null = canonicalSupabase,
  options: { force?: boolean } = {},
) {
  if (!client) throw new Error('Private media is waiting for your Studio session.');
  const cached = options.force ? null : readCanonicalSignedUrl(asset.storagePath);
  if (cached) return cached.url;

  const response = await client.storage
    .from('studio-assets')
    .createSignedUrl(asset.storagePath, CANONICAL_SIGNED_URL_SECONDS);
  if (response.error || !response.data?.signedUrl) {
    throw new Error(response.error?.message ?? 'The private image link could not be prepared.');
  }
  writeCanonicalSignedUrl(asset.storagePath, response.data.signedUrl);
  return response.data.signedUrl;
}

/** Reads an already-verified local copy so cached private images remain usable offline. */
export async function loadCachedCanonicalMediaBlob(asset: Pick<CanonicalMediaAsset, 'checksum' | 'id'>) {
  const staged = await cache.getMediaBlob(asset.id);
  if (!staged || staged.checksum !== asset.checksum) return null;
  return staged.blob;
}

export function clearCanonicalMediaUrl(storagePath: string) {
  signedUrlCache.delete(storagePath);
  if (typeof window === 'undefined') return;
  try {
    const entries = readCanonicalSignedUrlEntries();
    delete entries[storagePath];
    window.sessionStorage.setItem(CANONICAL_SIGNED_URL_CACHE_KEY, JSON.stringify(entries));
  } catch {
    // Memory cache removal is enough when browser storage is unavailable.
  }
}

export async function loadCanonicalStoredBlob(asset: {
  checksum: string;
  id: string;
  name?: string;
  storagePath: string;
}, client: SupabaseClient<Database> | null = canonicalSupabase) {
  const staged = await cache.getMediaBlob(asset.id);
  if (staged) return staged.blob;
  if (!client) return null;
  const response = await client.storage.from('studio-assets').download(asset.storagePath);
  if (response.error) throw new Error(response.error.message);
  const checksum = await sha256(response.data);
  if (checksum !== asset.checksum) throw new Error(`Stored media checksum mismatch for ${asset.name ?? asset.id}.`);
  await cache.putMediaBlob(asset.id, response.data, checksum);
  return response.data;
}

export async function uploadStagedCanonicalMedia(
  asset: Pick<CanonicalMediaAsset, 'checksum' | 'id' | 'mimeType' | 'storagePath'>,
  store = cache,
  client: SupabaseClient<Database> | null = canonicalSupabase,
) {
  if (!client) throw new Error('Canonical Storage is unavailable.');
  const staged = await store.getMediaBlob(asset.id);
  if (!staged) return false;
  if (staged.checksum !== asset.checksum) throw new Error('Staged media checksum changed before upload.');
  const upload = await client.storage.from('studio-assets').upload(asset.storagePath, staged.blob, {
    cacheControl: '31536000',
    contentType: asset.mimeType,
    upsert: false,
  });
  if (!upload.error) return true;
  const existing = await client.storage.from('studio-assets').download(asset.storagePath);
  if (existing.error) throw new Error(upload.error.message);
  if (await sha256(existing.data) !== asset.checksum) {
    throw new Error('A different object already exists at the canonical media path.');
  }
  return true;
}

async function sha256(blob: Blob) {
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
  }
  // Tests without SubtleCrypto still get the same deterministic fallback used
  // by the canonical cache; production browsers always take the SHA-256 path.
  return canonicalValueChecksum([...new Uint8Array(await blob.arrayBuffer())]);
}

function readCanonicalSignedUrl(storagePath: string) {
  const memoryEntry = signedUrlCache.get(storagePath);
  if (isCanonicalSignedUrlFresh(memoryEntry)) return memoryEntry;
  if (typeof window === 'undefined') return null;
  try {
    const entry = readCanonicalSignedUrlEntries()[storagePath];
    if (!isCanonicalSignedUrlFresh(entry)) return null;
    signedUrlCache.set(storagePath, entry);
    return entry;
  } catch {
    return null;
  }
}

function writeCanonicalSignedUrl(storagePath: string, url: string) {
  const entry = {
    expiresAt: Date.now() + CANONICAL_SIGNED_URL_SECONDS * 1000,
    url,
  } satisfies CanonicalSignedUrlCacheEntry;
  signedUrlCache.set(storagePath, entry);
  if (typeof window === 'undefined') return;
  try {
    const entries = readCanonicalSignedUrlEntries();
    entries[storagePath] = entry;
    window.sessionStorage.setItem(CANONICAL_SIGNED_URL_CACHE_KEY, JSON.stringify(entries));
  } catch {
    // The in-memory cache still avoids duplicate signing in this tab.
  }
}

function readCanonicalSignedUrlEntries() {
  return JSON.parse(
    window.sessionStorage.getItem(CANONICAL_SIGNED_URL_CACHE_KEY) ?? '{}',
  ) as Record<string, CanonicalSignedUrlCacheEntry>;
}

function isCanonicalSignedUrlFresh(entry?: CanonicalSignedUrlCacheEntry | null) {
  return Boolean(entry && entry.expiresAt - CANONICAL_SIGNED_URL_REFRESH_BUFFER_MS > Date.now());
}
